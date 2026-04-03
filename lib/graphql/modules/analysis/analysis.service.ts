import UsageSession from "@/models/UsageSession.model";
import Equipment from "@/models/Equipment.model";
import Room from "@/models/Room.model";
import EquipmentCatalog from "@/models/EquipmentCatalog.model";
import { AggregationService } from "../aggregation/aggregation.service";

export class AnalysisService {
  static readonly RATE_PER_KWH = 8;

  static async calculateSessionMetrics(equipmentId: string, durationMinutes: number) {
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) throw new Error("Equipment not found");

    const effectiveWatt =
      equipment.ratedPowerWatt *
      equipment.quantity *
      equipment.efficiencyFactor;

    const energyKwh = (effectiveWatt * (durationMinutes / 60)) / 1000;
    const cost = energyKwh * AnalysisService.RATE_PER_KWH;

    return { energyKwh, cost };
  }

  // start
  static async startSession(equipmentId: string) {
    console.log("syncEquipmentSessionState triggered", {
      equipmentId,
      action: "start",
    });

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) throw new Error("Equipment not found");

    const existingOpenSession = await UsageSession.findOne({
      equipmentId,
      endedAt: { $exists: false },
    }).sort({ startedAt: -1 });

    if (existingOpenSession) {
      return existingOpenSession._id;
    }

    const room = await Room.findById(equipment.roomId);
    if (!room) throw new Error("Room not found");

    const equipmentCatalog = equipment.catalogId
      ? await EquipmentCatalog.findById(equipment.catalogId)
      : null;

    const session = await UsageSession.create({
      equipmentId,
      roomId: equipment.roomId,
      propertyId: room.propertyId,
      catalogId: equipment.catalogId,
      equipmentName: equipmentCatalog?.equipmentName || "Device",
      startedAt: new Date(),
    });

    console.log("usage session created", {
      sessionId: session._id.toString(),
      equipmentId,
      startedAt: session.startedAt.toISOString(),
    });

    return session._id;
  }

  // stop + calc
  static async stopSession(sessionId: string) {
    console.log("syncEquipmentSessionState triggered", {
      sessionId,
      action: "stop",
    });

    const session = await UsageSession.findById(sessionId);
    if (!session || session.endedAt) {
      return false;
    }

    const endTime = new Date();
    const durationMinutes =
      (endTime.getTime() - session.startedAt.getTime()) / (1000 * 60);

    const { energyKwh, cost } = await AnalysisService.calculateSessionMetrics(
      session.equipmentId.toString(),
      durationMinutes
    );

    session.endedAt = endTime;
    session.durationMinutes = durationMinutes;
    session.energyKwh = energyKwh;
    session.cost = cost;

    await session.save();
    console.log("usage session completed", {
      sessionId,
      equipmentId: session.equipmentId.toString(),
      durationMinutes,
      energyKwh,
    });

    await AggregationService.recomputeDaily(
      session.startedAt.toISOString().slice(0, 10)
    );
    return true;
  }

  static async stopOpenSessionForEquipment(equipmentId: string) {
    const session = await UsageSession.findOne({
      equipmentId,
      endedAt: { $exists: false },
    }).sort({ startedAt: -1 });

    if (!session) {
      return false;
    }

    return AnalysisService.stopSession(session._id.toString());
  }

  static async syncEquipmentSessionState(equipmentId: string, isOn: boolean) {
    console.log("syncEquipmentSessionState triggered", { equipmentId, isOn });

    if (isOn) {
      await AnalysisService.startSession(equipmentId);
      return true;
    }

    await AnalysisService.stopOpenSessionForEquipment(equipmentId);
    return true;
  }

  
  static async getSessionsByProperty(propertyId: string) {
    return UsageSession.find({
      propertyId,
    }).sort({ startedAt: -1 });
  }

  static async updateSessionDuration(sessionId: string, durationMinutes: number) {
    const session = await UsageSession.findById(sessionId);
    if (!session) {
      throw new Error("Usage session not found");
    }
    if (!session.endedAt) {
      throw new Error("Only completed usage sessions can be edited");
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new Error("Duration must be greater than zero");
    }

    const today = new Date();
    const startedAt = new Date(session.startedAt);
    const isSameDay =
      startedAt.getFullYear() === today.getFullYear() &&
      startedAt.getMonth() === today.getMonth() &&
      startedAt.getDate() === today.getDate();

    if (!isSameDay) {
      throw new Error("Usage session duration can only be changed on the same day");
    }

    const { energyKwh, cost } = await AnalysisService.calculateSessionMetrics(
      session.equipmentId.toString(),
      durationMinutes
    );

    session.durationMinutes = durationMinutes;
    session.endedAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
    session.energyKwh = energyKwh;
    session.cost = cost;
    await session.save();

    await AggregationService.recomputeDaily(
      session.startedAt.toISOString().slice(0, 10)
    );

    return session;
  }
}
