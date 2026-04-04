import { gql } from "graphql-tag";

export const supportTypeDefs = gql`
  extend type Mutation {
    sendSupportEmail(subject: String!, message: String!): Boolean!
  }
`;
