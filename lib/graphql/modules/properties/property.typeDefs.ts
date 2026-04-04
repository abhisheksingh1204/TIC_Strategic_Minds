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

  input UpdatePropertyInput {
    propertyName: String!
  }

  extend type Query {
    myProperties: [Property!]!
    property(id: ID!): Property
  }

  extend type Mutation {
    createProperty(input: CreatePropertyInput!): Property!
    updateProperty(propertyId: ID!, input: UpdatePropertyInput!): Property!
    deleteProperty(propertyId: ID!): Boolean!
  }
`;
