import { gql } from "graphql-tag";

export const billingTypeDefs = gql`
  type BillLineItem {
    id: ID!
    billId: ID!
    equipmentId: ID!
    equipmentName: String!
    kwh: Float!
    amount: Float!
    createdAt: String!
    updatedAt: String!
  }

  type Bill {
    id: ID!
    propertyId: ID!
    tariffId: ID!
    periodStart: String!
    periodEnd: String!
    totalKwh: Float!
    totalAmount: Float!
    lineItems: [BillLineItem!]!
    createdAt: String!
    updatedAt: String!
  }

  type UserBillingSettings {
    id: ID!
    propertyId: ID!
    dailyLimit: Float
    monthlyLimit: Float
    alertType: String!
  }

  type EquipmentBreakdown {
    equipmentId: ID!
    equipmentName: String!
    kwh: Float!
    amount: Float!
  }

  type BillPreview {
    totalKwh: Float!
    totalAmount: Float!
    breakdown: [EquipmentBreakdown!]!
  }

  extend type Query {
    getBills(propertyId: ID!): [Bill!]!
    getBillById(billId: ID!): Bill
    getBillingLimit(propertyId: ID!): UserBillingSettings
    getBillPreview(propertyId: ID!, from: String!, to: String!): BillPreview!
  }

  extend type Mutation {
    generateBill(propertyId: ID!, from: String!, to: String!): Bill!
    setBillingLimit(
      propertyId: ID!
      dailyLimit: Float
      monthlyLimit: Float
      alertType: String!
    ): UserBillingSettings!
  }
`;
