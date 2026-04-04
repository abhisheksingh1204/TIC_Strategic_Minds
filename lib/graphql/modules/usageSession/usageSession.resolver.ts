import Equipment from "@/models/Equipment.model";
import { GraphQLContext } from "../../context";
import { UsageSessionService } from "./usageSession.service";

export const usageSessionResolvers = {
  Query: {
    usageSessions: (
      _: unknown,
      args: { roomId?: string; propertyId?: string; date?: string | null },
      context: GraphQLContext
    ) => {
      if (args.propertyId) {
        return UsageSessionService.getByProperty(
          context.userId,
          args.propertyId,
          args.date
        );
      }

      if (args.roomId) {
        return UsageSessionService.getByRoom(context.userId, args.roomId, args.date);
      }

      throw new Error("roomId or propertyId is required");
    },
  },

  Mutation: {
    updateUsageSession: (
      _: unknown,
      args: { sessionId: string; durationHours: number },
      context: GraphQLContext
    ) =>
      UsageSessionService.updateDuration(
        context.userId,
        args.sessionId,
        args.durationHours
      ),
    updateUsageSessionDuration: (
      _: unknown,
      args: { sessionId: string; durationMinutes: number },
      context: GraphQLContext
    ) =>
      UsageSessionService.updateDuration(
        context.userId,
        args.sessionId,
        args.durationMinutes / 60
      ),
    startUsageSession: (
      _: unknown,
      args: { equipmentId: string },
      context: GraphQLContext
    ) => UsageSessionService.startForEquipment(context.userId, args.equipmentId),
    stopUsageSession: (
      _: unknown,
      args: { equipmentId: string },
      context: GraphQLContext
    ) => UsageSessionService.stopForEquipment(context.userId, args.equipmentId),
    syncEquipmentUsageState: (
      _: unknown,
      args: { equipmentId: string; isOn: boolean },
      context: GraphQLContext
    ) =>
      args.isOn
        ? UsageSessionService.startForEquipment(context.userId, args.equipmentId).then(
            () => true
          )
        : UsageSessionService.stopForEquipment(context.userId, args.equipmentId).then(
            () => true
          ),
  },

  UsageSession: {
    _id: (session: { id: string }) => session.id,
    durationMinutes: (session: { durationHours: number }) => session.durationHours * 60,
    catalogId: async (session: { equipmentId?: string; id: string }) => {
      if (!session.equipmentId) {
        throw new Error(`equipmentId missing for usage session ${session.id}`);
      }

      const equipment = await Equipment.findById(session.equipmentId).select("catalogId");
      if (!equipment) {
        throw new Error("Equipment not found for usage session");
      }

      return equipment.catalogId ? String(equipment.catalogId) : null;
    },
    equipment: async (session: { equipmentId?: string; id: string }) => {
      if (!session.equipmentId) {
        throw new Error(`equipmentId missing for usage session ${session.id}`);
      }

      const equipment = await Equipment.findById(session.equipmentId);
      if (!equipment) {
        throw new Error("Equipment not found for usage session");
      }

      return equipment;
    },
  },
};
