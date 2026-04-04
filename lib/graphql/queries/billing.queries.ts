import { gql } from "@apollo/client";

export const GENERATE_BILL_MUTATION = gql`
  mutation GenerateBill($propertyId: ID!, $from: String!, $to: String!) {
    generateBill(propertyId: $propertyId, from: $from, to: $to) {
      id
      propertyId
      periodStart
      periodEnd
      totalKwh
      totalAmount
      createdAt
    }
  }
`;

export const GET_BILLS_QUERY = gql`
  query GetBills($propertyId: ID!) {
    getBills(propertyId: $propertyId) {
      id
      propertyId
      periodStart
      periodEnd
      totalKwh
      totalAmount
      createdAt
    }
  }
`;

export const GET_BILL_BY_ID_QUERY = gql`
  query GetBillById($billId: ID!) {
    getBillById(billId: $billId) {
      id
      propertyId
      periodStart
      periodEnd
      totalKwh
      totalAmount
      createdAt
      lineItems {
        id
        equipmentId
        equipmentName
        kwh
        amount
      }
    }
  }
`;

export const GET_BILLING_LIMIT_QUERY = gql`
  query GetBillingLimit($propertyId: ID!) {
    getBillingLimit(propertyId: $propertyId) {
      id
      propertyId
      dailyLimit
      monthlyLimit
      alertType
    }
  }
`;

export const GET_BILL_PREVIEW_QUERY = gql`
  query GetBillPreview($propertyId: ID!, $from: String!, $to: String!) {
    getBillPreview(propertyId: $propertyId, from: $from, to: $to) {
      totalKwh
      totalAmount
      breakdown {
        equipmentId
        equipmentName
        kwh
        amount
      }
    }
  }
`;

export const SET_BILLING_LIMIT_MUTATION = gql`
  mutation SetBillingLimit(
    $propertyId: ID!
    $dailyLimit: Float
    $monthlyLimit: Float
    $alertType: String!
  ) {
    setBillingLimit(
      propertyId: $propertyId
      dailyLimit: $dailyLimit
      monthlyLimit: $monthlyLimit
      alertType: $alertType
    ) {
      id
      propertyId
      dailyLimit
      monthlyLimit
      alertType
    }
  }
`;
