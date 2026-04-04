import { GraphQLError } from "graphql";
import Equipment from "@/models/Equipment.model";
import { UsageSessionService } from "../usageSession/usageSession.service";

type GetRoomUsageInput = {
  roomId: string;
  date?: string | null;
};

export const getRoomSimulation = async (
  userId: string | undefined,
  { roomId, date }: GetRoomUsageInput
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  const sessions = await UsageSessionService.getByRoom(userId, roomId, date);
  const equipmentIds = Array.from(new Set(sessions.map((session) => session.equipmentId)));

  const equipments = equipmentIds.length
    ? await Equipment.find({ _id: { $in: equipmentIds } })
    : [];

  const equipmentMap = new Map(
    equipments.map((equipment) => [String(equipment._id), equipment])
  );

  const aggregatedByEquipment = new Map<
    string,
    {
      equipmentId: string;
      totalEnergy: number;
      totalCost: number;
      durationHours: number;
      isActive: boolean;
      effectiveWatt: number;
    }
  >();

  for (const session of sessions) {
    const current = aggregatedByEquipment.get(session.equipmentId) ?? {
      equipmentId: session.equipmentId,
      totalEnergy: 0,
      totalCost: 0,
      durationHours: 0,
      isActive: false,
      effectiveWatt: session.effectiveWatt,
    };

    current.totalEnergy += session.energyKwh;
    current.totalCost += session.cost;
    current.durationHours += session.durationHours;
    current.isActive = current.isActive || session.isActive;
    current.effectiveWatt = session.effectiveWatt;

    aggregatedByEquipment.set(session.equipmentId, current);
  }

  const devices = Array.from(aggregatedByEquipment.values()).map((entry) => ({
    equipment: equipmentMap.get(entry.equipmentId),
    effectiveWatt: Number(entry.effectiveWatt.toFixed(6)),
    durationHours: Number(entry.durationHours.toFixed(6)),
    totalEnergy: Number(entry.totalEnergy.toFixed(6)),
    totalCost: Number(entry.totalCost.toFixed(6)),
    isActive: entry.isActive,
  }));

  return {
    totalDevices: devices.length,
    totalEnergy: Number(
      devices.reduce((sum, device) => sum + device.totalEnergy, 0).toFixed(6)
    ),
    totalCost: Number(
      devices.reduce((sum, device) => sum + device.totalCost, 0).toFixed(6)
    ),
    devices,
  };
};
