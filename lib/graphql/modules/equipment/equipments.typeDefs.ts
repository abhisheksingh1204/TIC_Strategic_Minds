import { gql } from "graphql-tag";

export const equipmentTypeDefs = gql`
  type Equipment {
    id: ID!
    roomId: ID!
    catalogId: ID!
    ratedPowerWatt: Float!
    hoursPerDay: Float!
    isOn: Boolean!
    quantity: Int!
    efficiencyFactor: Float!
    mode: String!
    createdAt: String!
    updatedAt: String!
  }

  input CreateEquipmentInput {
    roomId: ID!
    catalogId: ID!
    ratedPowerWatt: Float!
    hoursPerDay: Float
    isOn: Boolean
    quantity: Int
    efficiencyFactor: Float
    mode: String
  }

  input UpdateEquipmentInput {
    equipmentId: ID!
    ratedPowerWatt: Float
    hoursPerDay: Float
    isOn: Boolean
    quantity: Int
    efficiencyFactor: Float
    mode: String
  }

  extend type Query {
    equipmentsByRoom(roomId: ID!): [Equipment!]!
    equipmentsByProperty(propertyId: ID!): [Equipment!]!
  }

  extend type Mutation {
    createEquipment(input: CreateEquipmentInput!): Equipment!
    updateEquipment(input: UpdateEquipmentInput!): Equipment!
    deleteEquipment(equipmentId: ID!): Boolean!
  }
`;
