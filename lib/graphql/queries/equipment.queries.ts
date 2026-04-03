import { gql } from "@apollo/client";

export const EQUIPMENTS_BY_ROOM_QUERY = gql`
  query EquipmentsByRoom($roomId: ID!) {
    equipmentsByRoom(roomId: $roomId) {
      id
      roomId
      ratedPowerWatt
      hoursPerDay
      isOn
      quantity
      efficiencyFactor
      mode
      catalogId
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_EQUIPMENT_MUTATION = gql`
  mutation CreateEquipment($input: CreateEquipmentInput!) {
    createEquipment(input: $input) {
      id
      roomId
      catalogId
      ratedPowerWatt
      hoursPerDay
      isOn
      quantity
      efficiencyFactor
      mode
      createdAt
      updatedAt
    }
  }
`;

export const EQUIPMENTS_BY_PROPERTY_QUERY = gql`
  query EquipmentsByProperty($propertyId: ID!) {
    equipmentsByProperty(propertyId: $propertyId) {
      id
      roomId
      ratedPowerWatt
      hoursPerDay
      isOn
      quantity
      efficiencyFactor
      mode
      catalogId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_EQUIPMENT_MUTATION = gql`
  mutation UpdateEquipment($input: UpdateEquipmentInput!) {
    updateEquipment(input: $input) {
      id
      roomId
      catalogId
      ratedPowerWatt
      hoursPerDay
      isOn
      quantity
      efficiencyFactor
      mode
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_EQUIPMENT_MUTATION = gql`
  mutation DeleteEquipment($equipmentId: ID!) {
    deleteEquipment(equipmentId: $equipmentId)
  }
`;
