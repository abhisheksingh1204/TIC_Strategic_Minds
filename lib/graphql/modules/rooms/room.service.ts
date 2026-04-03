import { GraphQLError } from "graphql";
import Room from "@/models/Room.model";
import Property from "@/models/Property.model";
import Equipment from "@/models/Equipment.model";
import UsageSession from "@/models/UsageSession.model";
import EnergyAggregate from "@/models/EnergyAggregate.model";

interface CreateRoomInput {
  propertyId: string;
  roomName: string;
  roomType?: string;
}

export const createRoom = async (
  userId: string | undefined,
  input: CreateRoomInput
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  // 🔐 Check property ownership
  const property = await Property.findOne({
    _id: input.propertyId,
    userId,
  });

  if (!property) {
    throw new GraphQLError("Invalid property");
  }

  const room = await Room.create({
    propertyId: input.propertyId,
    roomName: input.roomName,
    roomType: input.roomType,
  });

  return room;
};

export const getRoomsByProperty = async (
  userId: string | undefined,
  propertyId: string
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  // 🔐 Validate ownership again
  const property = await Property.findOne({
    _id: propertyId,
    userId,
  });

  if (!property) {
    throw new GraphQLError("Invalid property");
  }

  return Room.find({ propertyId }).sort({ createdAt: -1 });
};

export const deleteRoom = async (
  userId: string | undefined,
  roomId: string
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new GraphQLError("Room not found");
  }

  const property = await Property.findOne({
    _id: room.propertyId,
    userId,
  });

  if (!property) {
    throw new GraphQLError("Invalid room");
  }

  const equipments = await Equipment.find({ roomId }).select("_id");
  const equipmentIds = equipments.map((equipment) => equipment._id);

  await UsageSession.deleteMany({
    $or: [
      { roomId },
      { equipmentId: { $in: equipmentIds } },
    ],
  });

  await EnergyAggregate.deleteMany({
    $or: [
      { scope: "ROOM", refId: roomId },
      ...(equipmentIds.length > 0
        ? [{ scope: "EQUIPMENT", refId: { $in: equipmentIds } }]
        : []),
    ],
  });

  await Equipment.deleteMany({ roomId });
  await Room.deleteOne({ _id: roomId });

  return true;
};
