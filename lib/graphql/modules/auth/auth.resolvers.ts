import {
  registerUser,
  loginUser,
  refreshAuthToken,
  getCurrentUser,
  updateMyName,
} from "./auth.service";
import { GraphQLContext } from "../../context";

/**
 * GraphQL argument types
 */
interface RegisterArgs {
  input: {
    name: string;
    email: string;
    password: string;
  };
}

interface LoginArgs {
  input: {
    email: string;
    password: string;
  };
}

interface RefreshTokenArgs {
  refreshToken: string;
}

interface UpdateMyNameArgs {
  name: string;
}

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: GraphQLContext) => {
      return getCurrentUser(context.userId);
    },
  },

  Mutation: {
    register: async (_: unknown, { input }: RegisterArgs) => {
      return registerUser(input);
    },

    login: async (_: unknown, { input }: LoginArgs) => {
      return loginUser(input);
    },

    refreshToken: async (_: unknown, { refreshToken }: RefreshTokenArgs) => {
      return refreshAuthToken(refreshToken);
    },

    logout: async () => {
      return true;
    },

    updateMyName: async (
      _: unknown,
      { name }: UpdateMyNameArgs,
      context: GraphQLContext,
    ) => {
      return updateMyName(context.userId, name);
    },
  },
};
