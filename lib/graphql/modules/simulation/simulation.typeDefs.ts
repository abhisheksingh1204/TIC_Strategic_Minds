import { gql } from "graphql-tag";

export const simulationTypeDefs = gql`
  type RoomSimulationDevice {
    equipment: Equipment
    effectiveWatt: Float!
    durationHours: Float!
    totalEnergy: Float!
    totalCost: Float!
    isActive: Boolean!
  }

  type RoomSimulation {
    totalDevices: Int!
    totalEnergy: Float!
    totalCost: Float!
    devices: [RoomSimulationDevice!]!
  }

  extend type Query {
    roomSimulation(
      roomId: ID!
      date: String
    ): RoomSimulation!
  }
`;
