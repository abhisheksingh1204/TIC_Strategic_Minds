import { gql } from "graphql-tag";

export const aggregationTypeDefs = gql`
  type EnergyAggregate {
    _id: ID!
    scope: String!
    refId: ID!
    type: String!
    year: Int
    month: Int
    date: String
    totalKwh: Float!
  }

  extend type Query {
    dailyEnergyAggregate(
      scope: String!
      refId: ID!
      date: String!
    ): EnergyAggregate

    rangeEnergyAggregate(
      scope: String!
      refId: ID!
      from: String!
      to: String!
    ): Float!

    monthlyEnergyAggregate(
      scope: String!
      refId: ID!
      month: Int!
      year: Int!
    ): EnergyAggregate
  }

  extend type Mutation {
    recomputeDailyAggregate(
      date: String!
    ): Boolean!
  }
`;
