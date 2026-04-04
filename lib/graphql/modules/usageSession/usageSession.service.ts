import { GraphQLError } from "graphql";
import mongoose from "mongoose";
import Equipment from "@/models/Equipment.model";
import EquipmentCatalog from "@/models/EquipmentCatalog.model";
import Property from "@/models/Property.model";
import Room from "@/models/Room.model";
import Tariff from "@/models/Tariff.model";
import UsageSession from "@/models/UsageSession.model";

type UsageSessionDoc = {
  _id: mongoose.Types.ObjectId;
  equipmentId: mongoose.Types.ObjectId | string;
  roomId: mongoose.Types.ObjectId | string;
  propertyId: mongoose.Types.ObjectId | string;
  equipmentName: string;
  startedAt: Date;
  endedAt?: Date | null;
  durationHours?: number | null;
  effectiveWatt: number;
  energyKwh?: number | null;
  cost?: number | null;
  isActive: boolean;
  isManuallyEdited: boolean;
  sessionDate: string;
};

type UsageSessionView = {
  id: string;
  equipmentId: string;
  roomId: string;
  propertyId: string;
  startedAt: string;
  endedAt: string | null;
  durationHours: number;
  energyKwh: number;
  cost: number;
  isActive: boolean;
  isManuallyEdited: boolean;
  equipmentName: string;
  effectiveWatt: number;
};

type EquipmentLike = {
  _id: mongoose.Types.ObjectId | string;
  ratedPowerWatt: number;
  quantity?: number;
  efficiencyFactor?: number;
  catalogId?: mongoose.Types.ObjectId | string | null;
};

type RoomLike = {
  _id: mongoose.Types.ObjectId | string;
  propertyId: mongoose.Types.ObjectId | string;
};

type PropertyLike = {
  _id: mongoose.Types.ObjectId | string;
};

const roundTo = (value: number, decimals = 6) =>
  Number(value.toFixed(decimals));

const getSessionDate = (value: Date) => value.toISOString().slice(0, 10);

const getEffectiveWatt = (equipment: {
  ratedPowerWatt: number;
  quantity?: number;
  efficiencyFactor?: number;
}) =>
  equipment.ratedPowerWatt * (equipment.quantity ?? 1) * (equipment.efficiencyFactor ?? 1);

const assertUser = (userId?: string): string => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  return userId;
};

const assertObjectId = (value: string, label: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new GraphQLError(`Invalid ${label}`);
  }
};

const assertRoomOwnership = async (userId: string, roomId: string) => {
  assertObjectId(roomId, "room id");

  const room = await Room.findById(roomId);
  if (!room) {
    throw new GraphQLError("Room not found");
  }

  const property = await Property.findOne({
    _id: room.propertyId,
    userId,
  });

  if (!property) {
    throw new GraphQLError("Unauthorized access to room");
  }

  return { room, property };
};

const assertEquipmentOwnership = async (userId: string, equipmentId: string) => {
  assertObjectId(equipmentId, "equipment id");

  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) {
    throw new GraphQLError("Equipment not found");
  }

  const { room, property } = await assertRoomOwnership(userId, String(equipment.roomId));

  return { equipment, room, property };
};

const assertSessionOwnership = async (userId: string, sessionId: string) => {
  assertObjectId(sessionId, "session id");

  const session = await UsageSession.findById(sessionId);
  if (!session) {
    throw new GraphQLError("Usage session not found");
  }

  const property = await Property.findOne({
    _id: session.propertyId,
    userId,
  }).select("_id");

  if (!property) {
    throw new GraphQLError("Unauthorized access to usage session");
  }

  return session;
};

const resolveTariffRate = async (propertyId: string, date: Date) => {
  const tariff = await Tariff.findOne({
    propertyId,
    effectiveFrom: { $lte: date },
  }).sort({ effectiveFrom: -1 });

  if (!tariff || !Array.isArray(tariff.slabs) || tariff.slabs.length === 0) {
    return 0;
  }

  if (tariff.tariffType === "FLAT") {
    return tariff.slabs[0]?.pricePerUnit ?? 0;
  }

  const firstOpenEndedSlab = tariff.slabs.find(
    (slab: { uptoKwh?: number | null; pricePerUnit: number }) => slab.uptoKwh == null
  );
  return firstOpenEndedSlab?.pricePerUnit ?? tariff.slabs[0]?.pricePerUnit ?? 0;
};

const activeSessionQuery = (equipmentId: string) => ({
  equipmentId,
  $or: [
    { isActive: true },
    { isActive: { $exists: false }, endedAt: null },
    { isActive: { $exists: false }, endedAt: { $exists: false } },
  ],
});

const hydrateLegacySession = async (
  session: mongoose.Document & Record<string, any>,
  {
    equipment,
    room,
    property,
    userId,
  }: {
    equipment: EquipmentLike;
    room: RoomLike;
    property: PropertyLike;
    userId: string;
  }
) => {
  let hasChanges = false;

  if (!session.userId) {
    session.userId = userId;
    hasChanges = true;
  }
  if (!session.roomId) {
    session.roomId = room._id;
    hasChanges = true;
  }
  if (!session.propertyId) {
    session.propertyId = property._id;
    hasChanges = true;
  }
  if (typeof session.effectiveWatt !== "number" || Number.isNaN(session.effectiveWatt)) {
    session.effectiveWatt = getEffectiveWatt(equipment);
    hasChanges = true;
  }
  if (!session.sessionDate) {
    session.sessionDate = getSessionDate(new Date(session.startedAt));
    hasChanges = true;
  }
  if (typeof session.isActive !== "boolean") {
    session.isActive = !session.endedAt;
    hasChanges = true;
  }
  if (typeof session.isManuallyEdited !== "boolean") {
    session.isManuallyEdited = false;
    hasChanges = true;
  }
  if (!session.equipmentName) {
    const equipmentCatalog = equipment.catalogId
      ? await EquipmentCatalog.findById(equipment.catalogId).select("equipmentName")
      : null;
    session.equipmentName = equipmentCatalog?.equipmentName || "Device";
    hasChanges = true;
  }
  if (typeof session.durationHours !== "number" || Number.isNaN(session.durationHours)) {
    session.durationHours = session.endedAt
      ? Math.max(
          0,
          (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 3600000
        )
      : 0;
    hasChanges = true;
  }
  if (typeof session.energyKwh !== "number" || Number.isNaN(session.energyKwh)) {
    session.energyKwh = (session.effectiveWatt * (session.durationHours ?? 0)) / 1000;
    hasChanges = true;
  }
  if (typeof session.cost !== "number" || Number.isNaN(session.cost)) {
    const tariffRate = await resolveTariffRate(String(property._id), new Date(session.startedAt));
    session.cost = session.energyKwh * tariffRate;
    hasChanges = true;
  }

  if (hasChanges) {
    await session.save();
  }

  return session;
};

const buildSessionView = async (
  session: UsageSessionDoc,
  referenceTime = new Date()
): Promise<UsageSessionView> => {
  const startedAt = new Date(session.startedAt);
  const endedAt = session.endedAt ? new Date(session.endedAt) : null;
  const hasLiveValues = session.isActive;
  const durationHours = hasLiveValues
    ? Math.max(0, (referenceTime.getTime() - startedAt.getTime()) / 3600000)
    : Math.max(0, session.durationHours ?? 0);
  const energyKwh = (session.effectiveWatt * durationHours) / 1000;

  let cost = session.cost ?? 0;
  if (hasLiveValues) {
    const tariffRate = await resolveTariffRate(String(session.propertyId), referenceTime);
    cost = energyKwh * tariffRate;
  }

  return {
    id: String(session._id),
    equipmentId: String(session.equipmentId),
    roomId: String(session.roomId),
    propertyId: String(session.propertyId),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt ? endedAt.toISOString() : null,
    durationHours: roundTo(durationHours),
    energyKwh: roundTo(energyKwh),
    cost: roundTo(cost),
    isActive: session.isActive,
    isManuallyEdited: session.isManuallyEdited,
    equipmentName: session.equipmentName,
    effectiveWatt: roundTo(session.effectiveWatt),
  };
};

export class UsageSessionService {
  static async startForEquipment(userId: string | undefined, equipmentId: string) {
    const authenticatedUserId = assertUser(userId);

    const { equipment, room, property } = await assertEquipmentOwnership(
      authenticatedUserId,
      equipmentId
    );

    const existingActiveSession = await UsageSession.findOne(
      activeSessionQuery(equipmentId)
    ).sort({ startedAt: -1 });

    if (existingActiveSession) {
      await hydrateLegacySession(existingActiveSession, {
        equipment,
        room,
        property,
        userId: authenticatedUserId,
      });
      return buildSessionView(existingActiveSession as unknown as UsageSessionDoc);
    }

    const equipmentCatalog = equipment.catalogId
      ? await EquipmentCatalog.findById(equipment.catalogId).select("equipmentName")
      : null;

    const session = await UsageSession.create({
      userId: authenticatedUserId,
      equipmentId: equipment._id,
      roomId: room._id,
      propertyId: property._id,
      equipmentName: equipmentCatalog?.equipmentName || "Device",
      startedAt: new Date(),
      durationHours: 0,
      effectiveWatt: getEffectiveWatt(equipment),
      energyKwh: 0,
      cost: 0,
      isActive: true,
      isManuallyEdited: false,
      sessionDate: getSessionDate(new Date()),
    });

    return buildSessionView(session as unknown as UsageSessionDoc);
  }

  static async stopForEquipment(userId: string | undefined, equipmentId: string) {
    const authenticatedUserId = assertUser(userId);

    const { equipment, room, property } = await assertEquipmentOwnership(
      authenticatedUserId,
      equipmentId
    );

    const session = await UsageSession.findOne(activeSessionQuery(equipmentId)).sort({
      startedAt: -1,
    });

    if (!session) {
      throw new GraphQLError("No active usage session found for this equipment");
    }

    await hydrateLegacySession(session, {
      equipment,
      room,
      property,
      userId: authenticatedUserId,
    });

    const endedAt = new Date();
    const startedAt = new Date(session.startedAt);
    const durationHours = Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 3600000);
    const energyKwh = (session.effectiveWatt * durationHours) / 1000;
    const tariffRate = await resolveTariffRate(String(session.propertyId), endedAt);
    const cost = energyKwh * tariffRate;

    session.endedAt = endedAt;
    session.durationHours = roundTo(durationHours);
    session.energyKwh = roundTo(energyKwh);
    session.cost = roundTo(cost);
    session.isActive = false;

    await session.save();

    return buildSessionView(session as unknown as UsageSessionDoc, endedAt);
  }

  static async getByRoom(userId: string | undefined, roomId: string, date?: string | null) {
    const authenticatedUserId = assertUser(userId);

    await assertRoomOwnership(authenticatedUserId, roomId);

    const query: Record<string, unknown> = { roomId };
    if (date) {
      query.sessionDate = date;
    }

    const sessions = await UsageSession.find(query).sort({ startedAt: -1 });
    return Promise.all(
      sessions.map((session) =>
        buildSessionView(session as unknown as UsageSessionDoc)
      )
    );
  }

  static async updateDuration(
    userId: string | undefined,
    sessionId: string,
    durationHours: number
  ) {
    const authenticatedUserId = assertUser(userId);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      throw new GraphQLError("durationHours must be greater than zero");
    }

    const session = await assertSessionOwnership(authenticatedUserId, sessionId);
    if (session.isActive) {
      throw new GraphQLError("Active sessions cannot be edited manually");
    }

    const startedAt = new Date(session.startedAt);
    const endedAt = new Date(startedAt.getTime() + durationHours * 3600000);
    const energyKwh = (session.effectiveWatt * durationHours) / 1000;
    const tariffRate = await resolveTariffRate(String(session.propertyId), endedAt);
    const cost = energyKwh * tariffRate;

    session.durationHours = roundTo(durationHours);
    session.endedAt = endedAt;
    session.energyKwh = roundTo(energyKwh);
    session.cost = roundTo(cost);
    session.isManuallyEdited = true;
    session.isActive = false;

    await session.save();

    return buildSessionView(session as unknown as UsageSessionDoc, endedAt);
  }
}
