import { gql } from "@apollo/client";

export const SEND_SUPPORT_EMAIL_MUTATION = gql`
  mutation SendSupportEmail($subject: String!, $message: String!) {
    sendSupportEmail(subject: $subject, message: $message)
  }
`;
