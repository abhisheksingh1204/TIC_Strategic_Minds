import { gql } from "graphql-tag";

export const authTypeDefs = gql`
  # Authenticated user object
  type User {
    id: ID!
    email: String!
    name: String
    createdAt: String!
    updatedAt: String!
  }

  # Authentication response after login / register
  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  # Input for user registration
  input RegisterInput {
    name: String
    email: String!
    password: String!
  }

  # Input for user login
  input LoginInput {
    email: String!
    password: String!
  }

  # Auth-related mutations
  extend type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    refreshToken(refreshToken: String!): AuthPayload!
    updateMyName(name: String!): User!
  }

  # Auth-related queries
  extend type Query {
    me: User
  }
`;
