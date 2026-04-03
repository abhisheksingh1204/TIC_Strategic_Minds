import UsageSession from "@/models/UsageSession.model";
import EnergyAggregate from "@/models/EnergyAggregate.model";
import Equipment from "@/models/Equipment.model";
import Room from "@/models/Room.model";
import { getDayRange } from "@/lib/date";

//helper for sum
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export class AggregationService {

  
  static async recomputeDaily(date: string) {
    const { start: dayStart, end: dayEnd } = getDayRange(date, date);

    await EnergyAggregate.deleteMany({
      type: "DAILY",
      date: dayStart,
    });

    const sessions = await UsageSession.find({
      startedAt: { $gte: dayStart, $lte: dayEnd },
      energyKwh: { $ne: null },
    });

    //equipment
    const equipmentMap = new Map<string, number>();
    sessions.forEach(s => {
      equipmentMap.set(
        s.equipmentId.toString(),
        (equipmentMap.get(s.equipmentId.toString()) || 0) + s.energyKwh!
      );
    });

    const equipmentAggregates = Array.from(equipmentMap.entries()).map(
      ([equipmentId, totalKwh]) => ({
        scope: "EQUIPMENT",
        refId: equipmentId,
        type: "DAILY",
        date: dayStart,
        year: dayStart.getFullYear(),
        month: dayStart.getMonth() + 1,
        totalKwh,
      })
    );

    if (equipmentAggregates.length > 0) {
      await EnergyAggregate.insertMany(equipmentAggregates);
    }

    
    const equipments = await Equipment.find({
      _id: { $in: Array.from(equipmentMap.keys()) },
    });

    //room
    const roomMap = new Map<string, number>();
    equipments.forEach(eq => {
      const eqEnergy = equipmentMap.get(eq._id.toString()) || 0;
      roomMap.set(
        eq.roomId.toString(),
        (roomMap.get(eq.roomId.toString()) || 0) + eqEnergy
      );
    });

    const roomAggregates = Array.from(roomMap.entries()).map(([roomId, totalKwh]) => ({
        scope: "ROOM",
        refId: roomId,
        type: "DAILY",
        date: dayStart,
        year: dayStart.getFullYear(),
        month: dayStart.getMonth() + 1,
        totalKwh,
      }));

    if (roomAggregates.length > 0) {
      await EnergyAggregate.insertMany(roomAggregates);
    }

    /** PROPERTY LEVEL */
    const rooms = await Room.find({
      _id: { $in: Array.from(roomMap.keys()) },
    });

    const propertyMap = new Map<string, number>();
    rooms.forEach(r => {
      const roomEnergy = roomMap.get(r._id.toString()) || 0;
      propertyMap.set(
        r.propertyId.toString(),
        (propertyMap.get(r.propertyId.toString()) || 0) + roomEnergy
      );
    });

    const propertyAggregates = Array.from(propertyMap.entries()).map(
      ([propertyId, totalKwh]) => ({
        scope: "PROPERTY",
        refId: propertyId,
        type: "DAILY",
        date: dayStart,
        year: dayStart.getFullYear(),
        month: dayStart.getMonth() + 1,
        totalKwh,
      })
    );

    if (propertyAggregates.length > 0) {
      await EnergyAggregate.insertMany(propertyAggregates);
    }

    return true;
  }

//   monthly
  static async monthly(scope: string, refId: string, month: number, year: number) {
    const data = await EnergyAggregate.find({
      scope,
      refId,
      type: "DAILY",
      month,
      year,
    });

    const totalKwh = sum(data.map(d => d.totalKwh));

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

    return sum(data.map(d => d.totalKwh));
  }
}
