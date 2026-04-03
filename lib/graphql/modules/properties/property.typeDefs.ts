import { gql } from "graphql-tag";

export const propertyTypeDefs = gql`
  enum PropertyType {
    HOUSE
    APARTMENT
  }

  type Property {
    id: ID!
    propertyName: String!
    propertyType: PropertyType!
    createdAt: String!
    updatedAt: String!
  }

  input CreatePropertyInput {
    propertyName: String!
    propertyType: PropertyType!
  }

  extend type Query {
    myProperties: [Property!]!
    property(id: ID!): Property
  }

  extend type Mutation {
    createProperty(input: CreatePropertyInput!): Property!
    deleteProperty(propertyId: ID!): Boolean!
  }
`;
