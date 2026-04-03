import { gql } from "@apollo/client";

export const ROOMS_BY_PROPERTY_QUERY = gql`
  query RoomsByProperty($propertyId: ID!) {
    roomsByProperty(propertyId: $propertyId) {
      id
      propertyId
      roomName
      roomType
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ROOM_MUTATION = gql`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) {
      id
      propertyId
      roomName
      roomType
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_ROOM_MUTATION = gql`
  mutation DeleteRoom($roomId: ID!) {
    deleteRoom(roomId: $roomId)
  }
`;
