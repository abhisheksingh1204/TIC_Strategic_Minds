import { AnalysisService } from "./analysis.service";

export const analysisResolvers = {
  Query: {
    usageSessions: (
      _: unknown,
      args: { propertyId: string }
    ) =>
      AnalysisService.getSessionsByProperty(args.propertyId),
  },

  Mutation: {
    startUsageSession: (
      _: unknown,
      args: { equipmentId: string }
    ) =>
      AnalysisService.startSession(args.equipmentId),

    stopUsageSession: (
      _: unknown,
      args: { sessionId: string }
    ) =>
      AnalysisService.stopSession(args.sessionId),

    updateUsageSessionDuration: (
      _: unknown,
      args: { sessionId: string; durationMinutes: number }
    ) =>
      AnalysisService.updateSessionDuration(args.sessionId, args.durationMinutes),

    syncEquipmentUsageState: (
      _: unknown,
      args: { equipmentId: string; isOn: boolean }
    ) =>
      AnalysisService.syncEquipmentSessionState(args.equipmentId, args.isOn),
  },
};
