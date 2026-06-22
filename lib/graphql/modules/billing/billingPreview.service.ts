import { Types } from "mongoose";
import EnergyAggregate from "@/models/EnergyAggregate.model";
import Equipment from "@/models/Equipment.model";
import EquipmentCatalog from "@/models/EquipmentCatalog.model";
import Property from "@/models/Property.model";
import Room from "@/models/Room.model";
import Tariff from "@/models/Tariff.model";
import UsageSession from "@/models/UsageSession.model";
import { getDayRange, parseDateInput } from "@/lib/date";
import {
  calculateProjectedEquipmentKwh,
  calculateTariffAmount,
  roundBillingValue,
} from "@/lib/billing-calculation";

type EquipmentBreakdown = {
  equipmentId: string;
  equipmentName: string;
  kwh: number;
  amount: number;
};

type BillPreview = {
  totalKwh: number;
  totalAmount: number;
  breakdown: EquipmentBreakdown[];
};

const DEVICE_NAME_BY_CATALOG_ID: Record<string, string> = {
  "000000000000000000000001": "Refrigerator",
  "000000000000000000000002": "AC",
  "000000000000000000000003": "TV",
  "000000000000000000000004": "LED Bulb",
  "000000000000000000000005": "Washing Machine",
  "000000000000000000000006": "Fan",
  "000000000000000000000007": "Microwave",
  "000000000000000000000008": "Computer",
  "000000000000000000000009": "Heater",
  "00000000000000000000000a": "Geyser",
  "00000000000000000000000b": "Induction",
  "00000000000000000000000c": "Table Lamp",
};

const createEmptyPreview = (): BillPreview => ({
  totalKwh: 0,
  totalAmount: 0,
  breakdown: [],
});

const roundValue = roundBillingValue;
const toObjectIdIfValid = (value: unknown) => {
  const stringValue = String(value ?? "");
  return Types.ObjectId.isValid(stringValue) ? new Types.ObjectId(stringValue) : null;
};
const isPlaceholderEquipmentName = (value: unknown) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return true;
  }

  if (normalized === "Device" || normalized === "Unknown") {
    return true;
  }

  return /^Equipment [A-Z0-9]{4,}$/i.test(normalized);
};

export class BillingPreviewService {
  static async getBillPreview(
    propertyId: string,
    from: string,
    to: string,
    userId?: string
  ): Promise<BillPreview> {
    if (!Types.ObjectId.isValid(propertyId)) {
      return createEmptyPreview();
    }

    const propertyObjectId = new Types.ObjectId(propertyId);
    const property = await Property.findById(propertyObjectId).select("_id userId");

    if (!property) {
      return createEmptyPreview();
    }

    if (userId && property.userId.toString() !== userId) {
      throw new Error("Property not found");
    }

    const fromDate = parseDateInput(from);
    const toDateValue = parseDateInput(to);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDateValue.getTime()) ||
      fromDate > toDateValue
    ) {
      return createEmptyPreview();
    }

    const billingRange = getDayRange(from, to);

    const roomIds = await Room.find({ propertyId: propertyObjectId }).distinct("_id");
    const equipmentIds = await Equipment.find({ roomId: { $in: roomIds } }).distinct("_id");

    const [propertyAggregateRows, equipmentAggregateRows, tariff, equipmentDocs] = await Promise.all([
      EnergyAggregate.aggregate<{ totalKwh: number }>([
        {
          $match: {
            scope: "PROPERTY",
            refId: propertyObjectId,
            type: "DAILY",
            date: { $gte: billingRange.start, $lte: billingRange.end },
          },
        },
        {
          $group: {
            _id: null,
            totalKwh: { $sum: { $ifNull: ["$totalKwh", 0] } },
          },
        },
      ]),
      equipmentIds.length
        ? EnergyAggregate.aggregate<{ _id: Types.ObjectId; totalKwh: number }>([
            {
              $match: {
                scope: "EQUIPMENT",
                refId: { $in: equipmentIds },
                type: "DAILY",
                date: { $gte: billingRange.start, $lte: billingRange.end },
              },
            },
            {
              $group: {
                _id: "$refId",
                totalKwh: { $sum: { $ifNull: ["$totalKwh", 0] } },
              },
            },
          ])
        : Promise.resolve([]),
      Tariff.findOne({
        $or: [{ propertyId: propertyObjectId }, { property_id: propertyObjectId }],
      }).sort({ effectiveFrom: -1 }),
      Equipment.find({ _id: { $in: equipmentIds } })
        .select(
          "_id catalogId ratedPowerWatt hoursPerDay isOn quantity efficiencyFactor"
        )
        .lean<
          {
            _id: Types.ObjectId;
            catalogId?: Types.ObjectId | null;
            ratedPowerWatt?: number;
            hoursPerDay?: number;
            isOn?: boolean;
            quantity?: number;
            efficiencyFactor?: number;
          }[]
        >(),
    ]);

    const aggregateEquipmentTotalKwh = roundValue(
      equipmentAggregateRows.reduce((sum, row) => sum + (row.totalKwh ?? 0), 0)
    );
    const propertyAggregateTotalKwh = roundValue(
      propertyAggregateRows[0]?.totalKwh ?? 0
    );
    const billingDays = Math.max(
      1,
      Math.round(
        (new Date(toDateValue).setHours(0, 0, 0, 0) -
          new Date(fromDate).setHours(0, 0, 0, 0)) /
          (24 * 60 * 60 * 1000)
      ) + 1
    );
    const projectedEquipmentRows = equipmentDocs
      .map((equipment) => ({
        _id: equipment._id,
        totalKwh: roundValue(
          calculateProjectedEquipmentKwh(equipment, billingDays)
        ),
      }))
      .filter((row) => row.totalKwh > 0);
    const useProjectedUsage =
      propertyAggregateTotalKwh <= 0 && aggregateEquipmentTotalKwh <= 0;
    const billingEquipmentRows = useProjectedUsage
      ? projectedEquipmentRows
      : equipmentAggregateRows;
    const equipmentTotalKwh = roundValue(
      billingEquipmentRows.reduce((sum, row) => sum + (row.totalKwh ?? 0), 0)
    );
    const totalKwh = roundValue(
      propertyAggregateTotalKwh > 0 ? propertyAggregateTotalKwh : equipmentTotalKwh
    );
    const totalAmount = calculateTariffAmount(totalKwh, tariff);

    const aggregateEquipmentIds = billingEquipmentRows.map((row) => row._id.toString());
    const aggregateEquipmentObjectIds = aggregateEquipmentIds
      .map((equipmentId) => toObjectIdIfValid(equipmentId))
      .filter((equipmentId): equipmentId is Types.ObjectId => Boolean(equipmentId));

    const catalogIds = equipmentDocs
      .map((equipment) => equipment.catalogId)
      .filter((catalogId): catalogId is Types.ObjectId => Boolean(catalogId));

    const catalogDocs = catalogIds.length
      ? await EquipmentCatalog.find({ _id: { $in: catalogIds } })
          .select("_id equipmentName")
          .lean<{ _id: Types.ObjectId; equipmentName?: string }[]>()
      : [];

    const sessionNameDocs = await UsageSession.find({
      propertyId: propertyObjectId,
      sessionDate: {
        $gte: billingRange.start.toISOString().slice(0, 10),
        $lte: billingRange.end.toISOString().slice(0, 10),
      },
      equipmentId: { $in: aggregateEquipmentObjectIds },
      equipmentName: { $exists: true, $ne: "" },
    })
      .select("equipmentId equipmentName startedAt")
      .sort({ startedAt: -1 })
      .lean<
        {
          equipmentId: Types.ObjectId | string;
          equipmentName?: string;
          startedAt: Date;
        }[]
      >();

    const equipmentById = new Map(
      equipmentDocs.map((equipment) => [equipment._id.toString(), equipment])
    );
    const catalogById = new Map(
      catalogDocs.map((catalog) => [catalog._id.toString(), catalog.equipmentName || "Device"])
    );
    const sessionNameByEquipmentId = new Map<string, string>();

    for (const session of sessionNameDocs) {
      const equipmentId = String(session.equipmentId);

      if (
        !sessionNameByEquipmentId.has(equipmentId) &&
        session.equipmentName &&
        !isPlaceholderEquipmentName(session.equipmentName)
      ) {
        sessionNameByEquipmentId.set(equipmentId, session.equipmentName);
      }
    }

    const breakdown = billingEquipmentRows
      .map((row) => {
        const equipmentId = row._id.toString();
        const equipment = equipmentById.get(equipmentId);
        const catalogFallback =
          equipment?.catalogId
            ? DEVICE_NAME_BY_CATALOG_ID[equipment.catalogId.toString()]
            : null;
        const equipmentName =
          sessionNameByEquipmentId.get(equipmentId) ||
          (equipment?.catalogId && catalogById.get(equipment.catalogId.toString())) ||
          catalogFallback ||
          `Device ${equipmentId.slice(-4).toUpperCase()}`;
        const kwh = roundValue(row.totalKwh ?? 0);

        return {
          equipmentId,
          equipmentName,
          kwh,
          amount:
            totalKwh > 0
              ? roundValue((kwh / totalKwh) * totalAmount)
              : 0,
        };
      })
      .filter((item) => item.kwh > 0)
      .sort((left, right) => right.kwh - left.kwh);

    const allocatedAmount = roundValue(
      breakdown.reduce((sum, item) => sum + item.amount, 0)
    );
    const roundingDifference = roundValue(totalAmount - allocatedAmount);

    if (breakdown.length > 0 && roundingDifference !== 0) {
      breakdown[breakdown.length - 1].amount = roundValue(
        breakdown[breakdown.length - 1].amount + roundingDifference
      );
    }

    return {
      totalKwh,
      totalAmount,
      breakdown,
    };
  }
}
