import { Types } from "mongoose";
import Bill from "@/models/Bill";
import BillLineItem from "@/models/BillLineItem";
import EnergyAggregate from "@/models/EnergyAggregate.model";
import Equipment from "@/models/Equipment.model";
import EquipmentCatalog from "@/models/EquipmentCatalog.model";
import Property from "@/models/Property.model";
import Room from "@/models/Room.model";
import Tariff from "@/models/Tariff.model";
import UsageSession from "@/models/UsageSession.model";
import { getDayRange, parseDateInput } from "@/lib/date";
import { AggregationService } from "../aggregation/aggregation.service";
import { BillingPreviewService } from "./billingPreview.service";
import { BillingSettingsService } from "./billingSettings.service";
import { CostService } from "../cost/cost.service";

type TariffType = "FLAT" | "SLAB";

type EquipmentUsage = {
  equipmentId: Types.ObjectId;
  totalKwh: number;
};

type DailyEquipmentAggregate = {
  refId: Types.ObjectId | null;
  totalKwh: number;
  date: Date;
};

type LineItemInsert = {
  bill_id: Types.ObjectId;
  equipment_id: Types.ObjectId;
  kwh: number;
  amount: number;
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

const normalizeTariffType = (tariffType: string): TariffType => {
  const normalized = tariffType.toUpperCase();

  if (normalized !== "FLAT" && normalized !== "SLAB") {
    throw new Error("tariffType must be either FLAT or SLAB");
  }

  return normalized;
};

const toObjectId = (value: string, label: string) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }

  return new Types.ObjectId(value);
};

const toDate = (value: string, label: string) => {
  const date = parseDateInput(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label}`);
  }

  return date;
};

const formatEntitySuffix = (value: unknown) => {
  if (value == null) {
    return "UNKN";
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return "UNKN";
  }

  return normalized.slice(-4).toUpperCase();
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

const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const formatAggregateDateKey = (value: Date) => {
  const normalized = startOfDay(value);
  return normalized.toISOString().split("T")[0];
};

const sumAmounts = (values: number[]) => values.reduce((total, value) => total + value, 0);

const mapFlatLineItems = (
  equipmentUsage: EquipmentUsage[],
  pricePerUnit: number
) => {
  if (pricePerUnit <= 0) {
    throw new Error("FLAT tariff requires a valid pricePerUnit");
  }

  return equipmentUsage.map(({ equipmentId, totalKwh }) => ({
    equipment_id: equipmentId,
    kwh: totalKwh,
    amount: totalKwh * pricePerUnit,
  }));
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

const mapProportionalLineItems = (
  equipmentUsage: EquipmentUsage[],
  totalKwh: number,
  totalCost: number
) => {
  if (totalKwh <= 0) {
    throw new Error("No energy data found for the selected range");
  }

  const lineItems = equipmentUsage.map(({ equipmentId, totalKwh: equipmentKwh }) => ({
    equipment_id: equipmentId,
    kwh: equipmentKwh,
    amount: roundCurrency((equipmentKwh / totalKwh) * totalCost),
  }));

  const allocatedTotal = sumAmounts(lineItems.map((item) => item.amount));
  const roundingDifference = roundCurrency(totalCost - allocatedTotal);

  if (lineItems.length > 0 && roundingDifference !== 0) {
    lineItems[lineItems.length - 1].amount = roundCurrency(
      lineItems[lineItems.length - 1].amount + roundingDifference
    );
  }

  return lineItems;
};

export class BillingService {
  private static async ensureDailyAggregates(fromDate: Date, toDate: Date) {
    const current = startOfDay(fromDate);
    const end = startOfDay(toDate);
    let hasUsageData = false;

    while (current <= end) {
      const recomputed = await AggregationService.recomputeDaily(
        formatDateKey(current)
      );
      hasUsageData = hasUsageData || recomputed;
      current.setDate(current.getDate() + 1);
    }

    if (!hasUsageData) {
      throw new Error("No usage data found for selected date");
    }
  }

  static async getBills(propertyId: string, userId?: string) {
    const propertyObjectId = toObjectId(propertyId, "propertyId");
    const property = await Property.findById(propertyObjectId).select("_id userId");

    if (!property) {
      throw new Error("Property not found");
    }

    if (userId && property.userId.toString() !== userId) {
      throw new Error("Property not found");
    }

    return Bill.find({ property_id: propertyObjectId }).sort({
      period_start: -1,
      createdAt: -1,
    });
  }

  static async getBillById(billId: string, userId?: string) {
    const billObjectId = toObjectId(billId, "billId");
    const bill = await Bill.findById(billObjectId);

    if (!bill) {
      throw new Error("Bill not found");
    }

    const property = await Property.findById(bill.property_id).select("_id userId");

    if (!property) {
      throw new Error("Property not found");
    }

    if (userId && property.userId.toString() !== userId) {
      throw new Error("Bill not found");
    }

    return bill;
  }

  static async getEquipmentName(equipmentId: string | Types.ObjectId) {
    const equipmentIdString = String(equipmentId);
    const [equipment, latestSession] = await Promise.all([
      Equipment.findById(equipmentId).select("catalogId"),
      UsageSession.findOne({
        equipmentId: Types.ObjectId.isValid(equipmentIdString)
          ? new Types.ObjectId(equipmentIdString)
          : equipmentId,
        equipmentName: { $exists: true, $ne: "" },
      })
        .sort({ startedAt: -1, createdAt: -1 })
        .select("equipmentName")
        .lean<{ equipmentName?: string } | null>(),
    ]);

    if (latestSession?.equipmentName && !isPlaceholderEquipmentName(latestSession.equipmentName)) {
      return latestSession.equipmentName;
    }

    if (!equipment) {
      return `Equipment ${formatEntitySuffix(equipmentId)}`;
    }

    const catalog = await EquipmentCatalog.findById(equipment.catalogId).select("equipmentName");
    const catalogFallback = equipment.catalogId
      ? DEVICE_NAME_BY_CATALOG_ID[String(equipment.catalogId)]
      : null;

    return (
      catalog?.equipmentName ||
      catalogFallback ||
      `Equipment ${formatEntitySuffix(equipmentId)}`
    );
  }

  static async generateBill(
    propertyId: string,
    from: string,
    to: string,
    userId?: string
  ) {
    const propertyObjectId = toObjectId(propertyId, "propertyId");
    const fromDate = toDate(from, "from date");
    const toDateValue = toDate(to, "to date");
    const billingRange = getDayRange(from, to);

    if (fromDate > toDateValue) {
      throw new Error("from date must be before or equal to to date");
    }

    const property = await Property.findById(propertyObjectId).select("_id userId");
    if (!property) {
      throw new Error("Property not found");
    }

    if (userId && property.userId.toString() !== userId) {
      throw new Error("Property not found");
    }

    try {
      await BillingService.ensureDailyAggregates(fromDate, toDateValue);
    } catch (error) {
      console.warn("Billing aggregate recompute warning:", error);
    }

    const propertyMatchQuery = {
      $or: [
        { propertyId: propertyObjectId },
        { property_id: propertyObjectId },
      ],
    };

    let tariff = await Tariff.findOne({
      ...propertyMatchQuery,
      effectiveFrom: { $lte: billingRange.end },
    }).sort({ effectiveFrom: -1 });

    if (!tariff) {
      tariff = await Tariff.findOne(propertyMatchQuery).sort({ effectiveFrom: -1 });
    }

    if (!tariff) {
      tariff = await Tariff.create({
        propertyId: propertyObjectId,
        tariffType: "FLAT",
        slabs: [{ pricePerUnit: 5 }],
        effectiveFrom: billingRange.start,
      });
    }

    const preview = await BillingPreviewService.getBillPreview(
      propertyId,
      from,
      to,
      userId
    );

    let bill = await Bill.findOne({
      property_id: propertyObjectId,
      period_start: fromDate,
      period_end: toDateValue,
    });
    const createdNewBill = !bill;

    if (bill) {
      bill.tariff_id = tariff._id;
      bill.total_kwh = preview.totalKwh;
      bill.total_amount = preview.totalAmount;
      await bill.save();
    } else {
      bill = await Bill.create({
        property_id: propertyObjectId,
        tariff_id: tariff._id,
        period_start: fromDate,
        period_end: toDateValue,
        total_kwh: preview.totalKwh,
        total_amount: preview.totalAmount,
      });
    }

    try {
      await BillLineItem.deleteMany({ bill_id: bill._id });

      const lineItemsToInsert: LineItemInsert[] = preview.breakdown
        .filter((item) => Types.ObjectId.isValid(item.equipmentId))
        .map((item) => ({
          bill_id: bill._id as Types.ObjectId,
          equipment_id: new Types.ObjectId(item.equipmentId),
          kwh: item.kwh,
          amount: item.amount,
        }));

      if (lineItemsToInsert.length > 0) {
        await BillLineItem.insertMany(lineItemsToInsert);
      }
    } catch (error) {
      if (createdNewBill) {
        await Bill.findByIdAndDelete(bill._id);
      }
      throw error;
    }

    try {
      await BillingSettingsService.checkAndSendAlertsForGeneratedBill(
        propertyId,
        from,
        to,
        preview.totalKwh,
        preview.totalAmount
      );
    } catch (error) {
      console.warn("Billing alert check warning:", error);
    }

    return bill;
  }
}
