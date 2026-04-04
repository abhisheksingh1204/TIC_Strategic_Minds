import { gql } from "@apollo/client";

export const ACTIVE_TARIFF_QUERY = gql`
  query ActiveTariff($propertyId: ID!, $date: String!) {
    activeTariff(propertyId: $propertyId, date: $date) {
      _id
      propertyId
      tariffType
      slabs {
        uptoKwh
        pricePerUnit
      }
      effectiveFrom
    }
  }
`;

export const CREATE_TARIFF_MUTATION = gql`
  mutation CreateTariff(
    $propertyId: ID!
    $tariffType: String!
    $slabs: [TariffSlabInput!]!
    $effectiveFrom: String!
  ) {
    createTariff(
      propertyId: $propertyId
      tariffType: $tariffType
      slabs: $slabs
      effectiveFrom: $effectiveFrom
    )
  }
`;

export const UPDATE_TARIFF_MUTATION = gql`
  mutation UpdateTariff(
    $tariffId: ID!
    $tariffType: String!
    $slabs: [TariffSlabInput!]!
  ) {
    updateTariff(
      tariffId: $tariffId
      tariffType: $tariffType
      slabs: $slabs
    )
  }
`;
