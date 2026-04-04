import { gql } from "graphql-tag";

export const propertyTypeDef = gql`
  type Property {
    _id: ID!
    name: String
  }

  type Query {
    allProperties: [Property!]!
  }
`;
