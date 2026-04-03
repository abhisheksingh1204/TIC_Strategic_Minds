import { GraphQLError } from "graphql";
import mongoose from "mongoose";
import Equipment from "@/models/Equipment.model";
import Room from "@/models/Room.model";
import Property from "@/models/Property.model";
import { AnalysisService } from "../analysis/analysis.service";

interface CreateEquipmentInput {
  roomId: string;
  catalogId: string;
  ratedPowerWatt: number;
  hoursPerDay?: number;
  isOn?: boolean;
  quantity?: number;
  efficiencyFactor?: number;
  mode?: "MANUAL" | "AUTOMATED";
}

interface UpdateEquipmentInput {
  equipmentId: string;
  ratedPowerWatt?: number;
  hoursPerDay?: number;
  isOn?: boolean;
  quantity?: number;
  efficiencyFactor?: number;
  mode?: "MANUAL" | "AUTOMATED";
}

const assertRoomOwnership = async (userId: string, roomId: string) => {
  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    throw new GraphQLError("Invalid room id");
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new GraphQLError("Invalid room");
  }

  const property = await Property.findOne({
    _id: room.propertyId,
    userId,
  });

  if (!property) {
    throw new GraphQLError("Unauthorized access to room");
  }

  return room;
};

export const createEquipment = async (
  userId: string | undefined,
  input: CreateEquipmentInput
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  await assertRoomOwnership(userId, input.roomId);

  const equipment = await Equipment.create({
    roomId: input.roomId,
    catalogId: input.catalogId,
    ratedPowerWatt: input.ratedPowerWatt,
    hoursPerDay: input.hoursPerDay ?? 4,
    isOn: input.isOn ?? false,
    quantity: input.quantity ?? 1,
    efficiencyFactor: input.efficiencyFactor ?? 1,
    mode: input.mode ?? "MANUAL",
  });

  if (equipment.isOn) {
    await AnalysisService.syncEquipmentSessionState(equipment._id.toString(), true);
  }

  return equipment;
};

export const getEquipmentsByRoom = async (
  userId: string | undefined,
  roomId: string
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  await assertRoomOwnership(userId, roomId);
  return Equipment.find({ roomId }).sort({ createdAt: -1 });
};

export const getEquipmentsByProperty = async (
  userId: string | undefined,
  propertyId: string
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new GraphQLError("Invalid property id");
  }

  const property = await Property.findOne({
    _id: propertyId,
    userId,
  });
  if (!property) {
    throw new GraphQLError("Invalid property");
  }

  const rooms = await Room.find({ propertyId }).select("_id");
  const roomIds = rooms.map((room) => room._id);

  if (roomIds.length === 0) {
    return [];
  }

  return Equipment.find({ roomId: { $in: roomIds } }).sort({ createdAt: -1 });
};

export const updateEquipment = async (
  userId: string | undefined,
  input: UpdateEquipmentInput
) => {
  console.log("updateEquipment called", input.isOn);

  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }
  if (!mongoose.Types.ObjectId.isValid(input.equipmentId)) {
    throw new GraphQLError("Invalid equipment id");
  }

  const equipment = await Equipment.findById(input.equipmentId);
  if (!equipment) {
    throw new GraphQLError("Equipment not found");
  }

  await assertRoomOwnership(userId, String(equipment.roomId));
  const previousIsOn = Boolean(equipment.isOn);

  if (typeof input.ratedPowerWatt === "number") {
    equipment.ratedPowerWatt = input.ratedPowerWatt;
  }
  if (typeof input.hoursPerDay === "number") {
    equipment.hoursPerDay = input.hoursPerDay;
  }
  if (typeof input.isOn === "boolean") {
    equipment.isOn = input.isOn;
  }
  if (typeof input.quantity === "number") {
    equipment.quantity = input.quantity;
  }
  if (typeof input.efficiencyFactor === "number") {
    equipment.efficiencyFactor = input.efficiencyFactor;
  }
  if (input.mode) {
    equipment.mode = input.mode;
  }

  await equipment.save();

  if (typeof input.isOn === "boolean" && input.isOn !== previousIsOn) {
    console.log("updateEquipment syncing session state", {
      equipmentId: equipment._id.toString(),
      previousIsOn,
      nextIsOn: input.isOn,
    });
    await AnalysisService.syncEquipmentSessionState(
      equipment._id.toString(),
      input.isOn
    );
  }

  return equipment;
};

export const deleteEquipment = async (
  userId: string | undefined,
  equipmentId: string
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }
  if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
    throw new GraphQLError("Invalid equipment id");
  }

  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) {
    throw new GraphQLError("Equipment not found");
  }

  await assertRoomOwnership(userId, String(equipment.roomId));
  await Equipment.deleteOne({ _id: equipmentId });
  return true;
};
