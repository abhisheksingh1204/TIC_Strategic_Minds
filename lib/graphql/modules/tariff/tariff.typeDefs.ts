import { gql } from "graphql-tag";

export const tariffTypeDefs = gql`
  type TariffSlab {
    uptoKwh: Float
    pricePerUnit: Float!
  }

  type Tariff {
    _id: ID!
    propertyId: ID!
    tariffType: String!
    slabs: [TariffSlab!]!
    effectiveFrom: String!
  }

  input TariffSlabInput {
    uptoKwh: Float
    pricePerUnit: Float!
  }

  extend type Query {
    activeTariff(
      propertyId: ID!
      date: String!
    ): Tariff
  }

  extend type Mutation {
    createTariff(
      propertyId: ID!
      tariffType: String!
      slabs: [TariffSlabInput!]!
      effectiveFrom: String!
    ): Boolean!
    updateTariff(
      tariffId: ID!
      tariffType: String!
      slabs: [TariffSlabInput!]!
    ): Boolean!
  }
`;
