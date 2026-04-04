import EnergyAggregate from "@/models/EnergyAggregate.model";
import Equipment from "@/models/Equipment.model";
import Room from "@/models/Room.model";
import Tariff from "@/models/Tariff.model";
import { getDayRange, parseDateInput } from "@/lib/date";

type BillingScope = "PROPERTY" | "ROOM" | "EQUIPMENT";
type TariffType = "FLAT" | "SLAB";

export class CostService {
  private static readonly STANDARD_SLABS = [
    { uptoKwh: 100, pricePerUnit: 3 },
    { uptoKwh: 200, pricePerUnit: 5 },
    { uptoKwh: null, pricePerUnit: 7 },
  ];

  private static async getTotalKwh(
    scope: BillingScope,
    refId: string,
    from: string,
    to: string
  ) {
    const { start, end } = getDayRange(from, to);

    const daily = await EnergyAggregate.find({
      scope,
      refId,
      type: "DAILY",
      date: {
        $gte: start,
        $lte: end,
      },
    });

    return daily.reduce((sum, d) => sum + d.totalKwh, 0);
  }

  private static normalizeTariffType(tariffType: string): TariffType {
    const normalized = tariffType.toUpperCase();

    if (normalized !== "FLAT" && normalized !== "SLAB") {
      throw new Error("tariffType must be either FLAT or SLAB");
    }

    return normalized;
  }

  private static calculateFlatCost(totalKwh: number, pricePerUnit: number) {
    if (pricePerUnit <= 0) {
      throw new Error("flatPricePerUnit must be greater than 0");
    }

    const totalCost = totalKwh * pricePerUnit;

    return {
      totalKwh,
      totalCost,
      breakdown: [
        {
          slabUpto: null,
          pricePerUnit,
          consumedKwh: totalKwh,
          cost: totalCost,
        },
      ],
    };
  }

  private static calculateSlabCost(
    totalKwh: number,
    configuredSlabs?: Array<{ uptoKwh?: number | null; pricePerUnit: number }>
  ) {
    const slabs =
      Array.isArray(configuredSlabs) && configuredSlabs.length > 0
        ? configuredSlabs.map((slab) => ({
            uptoKwh: slab.uptoKwh ?? null,
            pricePerUnit: slab.pricePerUnit,
          }))
        : CostService.STANDARD_SLABS;

    let remaining = totalKwh;
    let totalCost = 0;
    const breakdown: {
      slabUpto: number | null;
      pricePerUnit: number;
      consumedKwh: number;
      cost: number;
    }[] = [];

    let prevLimit = 0;

    for (const slab of slabs) {
      if (remaining <= 0) {
        break;
      }

      const slabLimit =
        slab.uptoKwh != null ? slab.uptoKwh - prevLimit : remaining;
      const consumedKwh = Math.min(remaining, slabLimit);
      const cost = consumedKwh * slab.pricePerUnit;

      breakdown.push({
        slabUpto: slab.uptoKwh,
        pricePerUnit: slab.pricePerUnit,
        consumedKwh,
        cost,
      });

      remaining -= consumedKwh;
      totalCost += cost;
      if (slab.uptoKwh != null) {
        prevLimit = slab.uptoKwh;
      }
    }

    return {
      totalKwh,
      totalCost,
      breakdown,
    };
  }

  private static async resolvePropertyId(scope: BillingScope, refId: string) {
    if (scope === "PROPERTY") {
      return refId;
    }

    if (scope === "ROOM") {
      const room = await Room.findById(refId).select("propertyId");
      if (!room) {
        throw new Error("Room not found");
      }

      return room.propertyId.toString();
    }

    const equipment = await Equipment.findById(refId).select("roomId");
    if (!equipment) {
      throw new Error("Equipment not found");
    }

    const room = await Room.findById(equipment.roomId).select("propertyId");
    if (!room) {
      throw new Error("Room not found for the selected equipment");
    }

    return room.propertyId.toString();
  }

  static async calculate(
    scope: BillingScope,
    refId: string,
    from: string,
    to: string
  ) {
    const totalKwh = await CostService.getTotalKwh(scope, refId, from, to);
    const propertyId = await CostService.resolvePropertyId(scope, refId);
    const effectiveFromDate = parseDateInput(from);

    const tariff = await Tariff.findOne({
      propertyId,
      effectiveFrom: { $lte: effectiveFromDate },
    }).sort({ effectiveFrom: -1 });

    if (!tariff) {
      throw new Error("No active tariff found");
    }

    const normalizedTariffType = CostService.normalizeTariffType(tariff.tariffType);

    if (normalizedTariffType === "FLAT") {
      const pricePerUnit = tariff.slabs?.[0]?.pricePerUnit;

      if (pricePerUnit == null) {
        throw new Error("FLAT tariff requires a pricePerUnit");
      }

      return CostService.calculateFlatCost(totalKwh, pricePerUnit);
    }

    return CostService.calculateSlabCost(totalKwh, tariff.slabs);
  }

  static async calculateWithTariff(
    scope: BillingScope,
    refId: string,
    from: string,
    to: string,
    tariffType: string,
    flatPricePerUnit?: number
  ) {
    const totalKwh = await CostService.getTotalKwh(scope, refId, from, to);
    const normalizedTariffType = CostService.normalizeTariffType(tariffType);

    if (normalizedTariffType === "FLAT") {
      if (flatPricePerUnit == null) {
        throw new Error("flatPricePerUnit is required for FLAT tariff");
      }

      return CostService.calculateFlatCost(totalKwh, flatPricePerUnit);
    }

    return CostService.calculateSlabCost(totalKwh);
  }
}
