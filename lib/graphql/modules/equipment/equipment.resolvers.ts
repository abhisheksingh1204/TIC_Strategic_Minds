import {
  createEquipment,
  deleteEquipment,
  getEquipmentsByProperty,
  getEquipmentsByRoom,
  updateEquipment,
} from "./equipment.service";
import { GraphQLContext } from "../../context";

export const equipmentResolvers = {
  Query: {
    equipmentsByRoom: (
      _: unknown,
      { roomId }: { roomId: string },
      context: GraphQLContext
    ) => {
      return getEquipmentsByRoom(context.userId, roomId);
    },
    equipmentsByProperty: (
      _: unknown,
      { propertyId }: { propertyId: string },
      context: GraphQLContext
    ) => {
      return getEquipmentsByProperty(context.userId, propertyId);
    },
  },

  Mutation: {
    createEquipment: (
      _: unknown,
      { input }: { input: {
        roomId: string;
        catalogId: string;
        ratedPowerWatt: number;
        hoursPerDay?: number;
        isOn?: boolean;
        quantity?: number;
        efficiencyFactor?: number;
        mode?: "MANUAL" | "AUTOMATED";
      } },
      context: GraphQLContext
    ) => {
      return createEquipment(context.userId, input);
    },

    updateEquipment: (
      _: unknown,
      { input }: { input: {
        equipmentId: string;
        ratedPowerWatt?: number;
        hoursPerDay?: number;
        isOn?: boolean;
        quantity?: number;
        efficiencyFactor?: number;
        mode?: "MANUAL" | "AUTOMATED";
      } },
      context: GraphQLContext
    ) => {
      return updateEquipment(context.userId, input);
    },

    deleteEquipment: (
      _: unknown,
      { equipmentId }: { equipmentId: string },
      context: GraphQLContext
    ) => {
      return deleteEquipment(context.userId, equipmentId);
    },
  },
};
