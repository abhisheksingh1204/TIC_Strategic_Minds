import { GraphQLContext } from "../../context";
import { getRoomSimulation } from "./simulation.service";

export const simulationResolvers = {
  Query: {
    roomSimulation: (
      _: unknown,
      args: {
        roomId: string;
        date?: string | null;
      },
      context: GraphQLContext
    ) => getRoomSimulation(context.userId, args),
  },
};
