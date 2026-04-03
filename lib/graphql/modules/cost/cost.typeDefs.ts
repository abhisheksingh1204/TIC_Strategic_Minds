import { gql } from "graphql-tag";

export const costTypeDefs = gql`
  type CostBreakdown {
    slabUpto: Float
    pricePerUnit: Float!
    consumedKwh: Float!
    cost: Float!
  }

  type CostResult {
    totalKwh: Float!
    totalCost: Float!
    breakdown: [CostBreakdown!]!
  }

  extend type Mutation {
    calculateCost(
      scope: String!
      refId: ID!
      from: String!
      to: String!
    ): CostResult!

    calculateCostWithTariff(
      scope: String!
      refId: ID!
      from: String!
      to: String!
      tariffType: String!
      flatPricePerUnit: Float
    ): CostResult!
  }
`;
