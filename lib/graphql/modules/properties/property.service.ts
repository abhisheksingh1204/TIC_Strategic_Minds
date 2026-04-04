import { GraphQLError } from "graphql";
import Property from "@/models/Property.model";
import { Types } from "mongoose";
import Room from "@/models/Room.model";
import Equipment from "@/models/Equipment.model";

interface CreatePropertyInput {
  propertyName: string;
  propertyType: "HOUSE" | "APARTMENT";
}

interface UpdatePropertyInput {
  propertyName: string;
}

export const createProperty = async (
  userId: string | null,
  input: CreatePropertyInput
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  const propertyName = input.propertyName.trim();

  if (!propertyName) {
    throw new GraphQLError("Property name is required");
  }

  const property = await Property.create({
    userId: new Types.ObjectId(userId),
    propertyName,
    propertyType: input.propertyType,
  });

  return property;
};

export const getMyProperties = async (userId: string | null) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  return Property.find({ userId }).sort({ createdAt: -1 });
};

export const getPropertyById = async (
  userId: string | null,
  propertyId: string
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  const property = await Property.findOne({
    _id: propertyId,
    userId,
  });

  if (!property) {
    throw new GraphQLError("Property not found");
  }

  return property;
};

export const updateProperty = async (
  userId: string | null,
  propertyId: string,
  input: UpdatePropertyInput
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  const propertyName = input.propertyName.trim();

  if (!propertyName) {
    throw new GraphQLError("Property name is required");
  }

  const property = await Property.findOne({
    _id: propertyId,
    userId,
  });

  if (!property) {
    throw new GraphQLError("Property not found");
  }

  property.propertyName = propertyName;
  await property.save();

  return property;
};

export const deleteProperty = async (
  userId: string | null,
  propertyId: string
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized");
  }

  const property = await Property.findOne({
    _id: propertyId,
    userId,
  });

  if (!property) {
    throw new GraphQLError("Property not found");
  }

  const rooms = await Room.find({ propertyId: property.id }).select("_id");
  const roomIds = rooms.map((room) => room._id);

  if (roomIds.length > 0) {
    await Equipment.deleteMany({ roomId: { $in: roomIds } });
    await Room.deleteMany({ _id: { $in: roomIds } });
  }

  await Property.deleteOne({ _id: property.id });
  return true;
};
