import {
  createProperty,
  deleteProperty,
  getMyProperties,
  getPropertyById,
  updateProperty,
} from "./property.service";
import { GraphQLContext } from "../../context";

interface CreatePropertyArgs {
  input: {
    propertyName: string;
    propertyType: "HOUSE" | "APARTMENT";
  };
}

interface UpdatePropertyArgs {
  propertyId: string;
  input: {
    propertyName: string;
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
    updateProperty: (
      _: unknown,
      { propertyId, input }: UpdatePropertyArgs,
      context: GraphQLContext
    ) => {
      return updateProperty(context.userId ?? null, propertyId, input);
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
