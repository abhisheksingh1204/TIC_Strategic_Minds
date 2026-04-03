import {
  createProperty,
  deleteProperty,
  getMyProperties,
  getPropertyById,
} from "./property.service";
import { GraphQLContext } from "../../context";

interface CreatePropertyArgs {
  input: {
    propertyName: string;
    propertyType: "HOUSE" | "APARTMENT";
  };
}

export const propertyResolvers = {
  Query: {
    myProperties: (
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ) => {
      return getMyProperties(context.userId ?? null);
    },

    property: (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      return getPropertyById(context.userId ?? null, id);
    },
  },

  Mutation: {
    createProperty: (
      _: unknown,
      { input }: CreatePropertyArgs,
      context: GraphQLContext
    ) => {
      return createProperty(context.userId ?? null, input);
    },

    deleteProperty: (
      _: unknown,
      { propertyId }: { propertyId: string },
      context: GraphQLContext
    ) => {
      return deleteProperty(context.userId ?? null, propertyId);
    },
  },
};
