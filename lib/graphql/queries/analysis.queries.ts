import { gql } from "@apollo/client";

export const USAGE_SESSIONS_QUERY = gql`
  query UsageSessions($propertyId: ID!) {
    usageSessions(propertyId: $propertyId) {
      _id
      equipmentId
      roomId
      propertyId
      catalogId
      equipmentName
      startedAt
      endedAt
      durationMinutes
      isActive
      energyKwh
      cost
    }
  }
`;

export const UPDATE_USAGE_SESSION_DURATION_MUTATION = gql`
  mutation UpdateUsageSessionDuration($sessionId: ID!, $durationMinutes: Float!) {
    updateUsageSessionDuration(
      sessionId: $sessionId
      durationMinutes: $durationMinutes
    ) {
      _id
      equipmentId
      roomId
      propertyId
      catalogId
      equipmentName
      startedAt
      endedAt
      durationMinutes
      isActive
      energyKwh
      cost
    }
  }
`;

export const SYNC_EQUIPMENT_USAGE_STATE_MUTATION = gql`
  mutation SyncEquipmentUsageState($equipmentId: ID!, $isOn: Boolean!) {
    syncEquipmentUsageState(equipmentId: $equipmentId, isOn: $isOn)
  }
`;
