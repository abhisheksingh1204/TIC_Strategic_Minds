import UsageSession from "@/models/UsageSession.model";
import EnergyAggregate from "@/models/EnergyAggregate.model";
import { getDayRange } from "@/lib/date";
import { BillingSettingsService } from "../billing/billingSettings.service";

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

type SessionLike = {
  equipmentId?: unknown;
  equipment_id?: unknown;
  propertyId?: unknown;
  property_id?: unknown;
  roomId?: unknown;
  room_id?: unknown;
  startedAt?: Date | string | null;
  startTime?: Date | string | null;
  endedAt?: Date | string | null;
  endTime?: Date | string | null;
  effectiveWatt?: number | null;
  powerRatingWatts?: number | null;
  energyKwh?: number | null;
};

const toDateOrNull = (value: unknown) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toPositiveNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

export class AggregationService {
  static async recomputeDaily(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error("Invalid aggregation date");
    }

    const dayStart = new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    const dayEnd = new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    await EnergyAggregate.deleteMany({
      type: "DAILY",
      date: dayStart,
    });

    const sessions = await UsageSession.find({
      startedAt: { $gte: dayStart, $lte: dayEnd },
    }).lean<SessionLike[]>();

    console.log("Aggregation Date:", date);
    console.log("Sessions Found:", sessions.length);

    if (sessions.length === 0) {
      return false;
    }

    const propertyEquipmentMap = new Map<string, Map<string, number>>();
    const roomEquipmentMap = new Map<string, Map<string, number>>();

    for (const session of sessions) {
      const equipmentId = String(session.equipmentId ?? session.equipment_id ?? "");
      const propertyId = String(session.propertyId ?? session.property_id ?? "");
      const roomId = String(session.roomId ?? session.room_id ?? "");
      const startedAt = toDateOrNull(session.startedAt ?? session.startTime);
      const endedAt = toDateOrNull(session.endedAt ?? session.endTime);

      if (!equipmentId || !propertyId || !roomId || !startedAt || !endedAt) {
        continue;
      }

      const durationHours =
        (endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60);

      if (!Number.isFinite(durationHours) || durationHours <= 0) {
        continue;
      }

      const powerRatingWatts = toPositiveNumber(
        session.effectiveWatt ?? session.powerRatingWatts
      );
      const computedKwh =
        powerRatingWatts > 0 ? (powerRatingWatts / 1000) * durationHours : 0;
      const kwh = Math.max(
        0,
        toPositiveNumber(session.energyKwh) || computedKwh
      );

      if (kwh <= 0) {
        continue;
      }

      const propertyEquipmentTotals =
        propertyEquipmentMap.get(propertyId) ?? new Map<string, number>();
      propertyEquipmentTotals.set(
        equipmentId,
        (propertyEquipmentTotals.get(equipmentId) || 0) + kwh
      );
      propertyEquipmentMap.set(propertyId, propertyEquipmentTotals);

      const roomEquipmentTotals =
        roomEquipmentMap.get(roomId) ?? new Map<string, number>();
      roomEquipmentTotals.set(
        equipmentId,
        (roomEquipmentTotals.get(equipmentId) || 0) + kwh
      );
      roomEquipmentMap.set(roomId, roomEquipmentTotals);
    }

    const year = dayStart.getFullYear();
    const month = dayStart.getMonth() + 1;

    for (const [propertyId, equipmentMap] of propertyEquipmentMap.entries()) {
      for (const [equipmentId, totalKwh] of equipmentMap.entries()) {
        await EnergyAggregate.findOneAndUpdate(
          {
            scope: "EQUIPMENT",
            refId: equipmentId,
            type: "DAILY",
            date: dayStart,
          },
          {
            scope: "EQUIPMENT",
            refId: equipmentId,
            type: "DAILY",
            totalKwh,
            year,
            month,
            date: dayStart,
          },
          { upsert: true, new: true }
        );
      }

      const totalKwh = sum(Array.from(equipmentMap.values()));

      console.log("Aggregation Debug:");
      console.log("Date:", date);
      console.log("Equipment count:", equipmentMap.size);
      console.log("Total kWh:", totalKwh);

      await EnergyAggregate.findOneAndUpdate(
        {
          scope: "PROPERTY",
          refId: propertyId,
          type: "DAILY",
          date: dayStart,
        },
        {
          scope: "PROPERTY",
          refId: propertyId,
          type: "DAILY",
          totalKwh,
          year,
          month,
          date: dayStart,
        },
        { upsert: true, new: true }
      );

      await BillingSettingsService.checkAndSendAlerts(propertyId, date);
    }

    for (const [roomId, equipmentMap] of roomEquipmentMap.entries()) {
      const totalKwh = sum(Array.from(equipmentMap.values()));

      await EnergyAggregate.findOneAndUpdate(
        {
          scope: "ROOM",
          refId: roomId,
          type: "DAILY",
          date: dayStart,
        },
        {
          scope: "ROOM",
          refId: roomId,
          type: "DAILY",
          totalKwh,
          year,
          month,
          date: dayStart,
        },
        { upsert: true, new: true }
      );
    }

    return true;
  }

  static async monthly(scope: string, refId: string, month: number, year: number) {
    const data = await EnergyAggregate.find({
      scope,
      refId,
      type: "DAILY",
      month,
      year,
    });

    const totalKwh = sum(data.map((d) => d.totalKwh));

    return {
      scope,
      refId,
      type: "MONTHLY",
      month,
      year,
      totalKwh,
    };
  }

  static async range(scope: string, refId: string, from: string, to: string) {
    const { start, end } = getDayRange(from, to);

    const data = await EnergyAggregate.find({
      scope,
      refId,
      type: "DAILY",
      date: { $gte: start, $lte: end },
    });

    return sum(data.map((d) => d.totalKwh));
  }
}
