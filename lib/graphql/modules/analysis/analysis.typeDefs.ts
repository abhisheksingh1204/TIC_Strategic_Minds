import { gql } from "graphql-tag";

export const analysisTypeDefs = gql`
  type UsageSession {
    _id: ID!
    equipmentId: ID!
    roomId: ID!
    propertyId: ID!
    catalogId: ID
    equipmentName: String!
    startedAt: String!
    endedAt: String
    durationMinutes: Float
    energyKwh: Float
    cost: Float
  }

  extend type Query {
    usageSessions(
      propertyId: ID!
    ): [UsageSession!]!
  }

  extend type Mutation {
    startUsageSession(
      equipmentId: ID!
    ): ID!

    stopUsageSession(
      sessionId: ID!
    ): Boolean!

    updateUsageSessionDuration(
      sessionId: ID!
      durationMinutes: Float!
    ): UsageSession!

    syncEquipmentUsageState(
      equipmentId: ID!
      isOn: Boolean!
    ): Boolean!
  }
`;
