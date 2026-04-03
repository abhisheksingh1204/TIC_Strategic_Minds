import { createRoom, deleteRoom, getRoomsByProperty } from "./room.service";
import { GraphQLContext } from "../../context";

type CreateRoomInput = {
  propertyId: string;
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
    deleteRoom: (
      _: unknown,
      { roomId }: { roomId: string },
      context: GraphQLContext
    ) => {
      return deleteRoom(context.userId, roomId);
    },
  },
};
