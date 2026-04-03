import { GraphQLError } from "graphql";
import { GraphQLContext } from "../lib/graphql/context";

export const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }

  return context.userId;
};