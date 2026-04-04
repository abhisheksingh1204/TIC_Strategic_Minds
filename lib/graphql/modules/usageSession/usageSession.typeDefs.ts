import { gql } from "graphql-tag";

export const usageSessionTypeDefs = gql`
  type UsageSession {
    id: ID!
    _id: ID!
    equipmentId: ID!
    roomId: ID!
    propertyId: ID!
    catalogId: ID
    equipmentName: String!
    equipment: Equipment!
    startedAt: String!
    endedAt: String
    durationHours: Float!
    durationMinutes: Float!
    energyKwh: Float!
    cost: Float!
    isActive: Boolean!
    isManuallyEdited: Boolean!
    effectiveWatt: Float!
  }

  extend type Query {
    usageSessions(
      roomId: ID
      propertyId: ID
      date: String
    ): [UsageSession!]!
  }

  extend type Mutation {
    updateUsageSession(
      sessionId: ID!
      durationHours: Float!
    ): UsageSession!
    updateUsageSessionDuration(
      sessionId: ID!
      durationMinutes: Float!
    ): UsageSession!
    startUsageSession(
      equipmentId: ID!
    ): UsageSession!
    stopUsageSession(
      equipmentId: ID!
    ): UsageSession!
    syncEquipmentUsageState(
      equipmentId: ID!
      isOn: Boolean!
    ): Boolean!
  }
`;
