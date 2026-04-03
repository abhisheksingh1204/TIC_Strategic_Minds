import { gql } from "@apollo/client";

export const MY_PROPERTIES_QUERY = gql`
  query MyProperties {
    myProperties {
      id
      propertyName
      propertyType
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PROPERTY_MUTATION = gql`
  mutation CreateProperty($input: CreatePropertyInput!) {
    createProperty(input: $input) {
      id
      propertyName
      propertyType
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_PROPERTY_MUTATION = gql`
  mutation DeleteProperty($propertyId: ID!) {
    deleteProperty(propertyId: $propertyId)
  }
`;
