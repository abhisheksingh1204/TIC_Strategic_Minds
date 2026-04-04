import { createRoom, deleteRoom, getRoomsByProperty, updateRoom } from "./room.service";
import { GraphQLContext } from "../../context";

type CreateRoomInput = {
  propertyId: string;
  roomName: string;
  roomType?: string;
};

type UpdateRoomInput = {
  roomName: string;
  roomType?: string;
};

export const roomResolvers = {
  Query: {
    roomsByProperty: (
      _: unknown,
      { propertyId }: { propertyId: string },
      context: GraphQLContext
    ) => {
      return getRoomsByProperty(context.userId, propertyId);
    },
  },

  Mutation: {
    createRoom: (
      _: unknown,
      { input }: { input: CreateRoomInput },
      context: GraphQLContext
    ) => {
      return createRoom(context.userId, input);
    },
    updateRoom: (
      _: unknown,
      { roomId, input }: { roomId: string; input: UpdateRoomInput },
      context: GraphQLContext
    ) => {
      return updateRoom(context.userId, roomId, input);
    },
    deleteRoom: (
      _: unknown,
      { roomId }: { roomId: string },
      context: GraphQLContext
    ) => {
      return deleteRoom(context.userId, roomId);
    },
  },
};
