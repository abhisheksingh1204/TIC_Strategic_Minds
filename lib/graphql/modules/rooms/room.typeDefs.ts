import { gql } from "graphql-tag";

export const roomTypeDefs = gql`
  type Room {
    id: ID!
    propertyId: ID!
    roomName: String!
    roomType: String
    createdAt: String!
    updatedAt: String!
  }

  input CreateRoomInput {
    propertyId: ID!
    roomName: String!
    roomType: String
  }

  input UpdateRoomInput {
    roomName: String!
    roomType: String
  }

  extend type Query {
    roomsByProperty(propertyId: ID!): [Room!]!
  }

  extend type Mutation {
    createRoom(input: CreateRoomInput!): Room!
    updateRoom(roomId: ID!, input: UpdateRoomInput!): Room!
    deleteRoom(roomId: ID!): Boolean!
  }
`;
