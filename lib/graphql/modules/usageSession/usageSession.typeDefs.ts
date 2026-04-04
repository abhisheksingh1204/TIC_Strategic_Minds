import { gql } from "graphql-tag";

export const usageSessionTypeDefs = gql`
  type UsageSession {
    id: ID!
    equipment: Equipment!
    startedAt: String!
    endedAt: String
    durationHours: Float!
    energyKwh: Float!
    cost: Float!
    isActive: Boolean!
    isManuallyEdited: Boolean!
  }

  extend type Query {
    usageSessions(
      roomId: ID!
      date: String
    ): [UsageSession!]!
  }

  extend type Mutation {
    updateUsageSession(
      sessionId: ID!
      durationHours: Float!
    ): UsageSession!
  }
`;
