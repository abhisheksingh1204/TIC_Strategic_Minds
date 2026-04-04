import Equipment from "@/models/Equipment.model";
import { GraphQLContext } from "../../context";
import { UsageSessionService } from "./usageSession.service";

export const usageSessionResolvers = {
  Query: {
    usageSessions: (
      _: unknown,
      args: { roomId: string; date?: string | null },
      context: GraphQLContext
    ) => UsageSessionService.getByRoom(context.userId, args.roomId, args.date),
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
  },

  UsageSession: {
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
