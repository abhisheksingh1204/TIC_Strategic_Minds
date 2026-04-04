"use client";

import {
  ApolloClient,
  ApolloLink,
  createHttpLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { SetContextLink } from "@apollo/client/link/context";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "@/lib/auth";

const graphqlUri = process.env.NEXT_PUBLIC_GRAPHQL_URL || "/api";

const httpLink = createHttpLink({
  uri: graphqlUri,
});

const refreshMutation = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`;

let isRefreshing = false;
let pendingResolvers: Array<(token: string | null) => void> = [];

const resolvePending = (token: string | null) => {
  const resolvers = [...pendingResolvers];
  pendingResolvers = [];
  resolvers.forEach((resolve) => resolve(token));
};

const shouldAttemptRefresh = (messages: string[] = [], codes: string[] = []) =>
  messages.some((message) => /unauthorized|expired|invalid/i.test(message)) ||
  codes.includes("UNAUTHENTICATED");

const requestTokenRefresh = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  const response = await fetch(graphqlUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: refreshMutation,
      variables: { refreshToken },
    }),
  });

  const payload = await response.json();
  const nextAccessToken = payload?.data?.refreshToken?.accessToken as string | undefined;
  const nextRefreshToken = payload?.data?.refreshToken?.refreshToken as string | undefined;

  if (!response.ok || !nextAccessToken || !nextRefreshToken) {
    clearAuthTokens();
    return null;
  }

  setAuthTokens(nextAccessToken, nextRefreshToken);
  return nextAccessToken;
};

const authLink = new SetContextLink((prevContext) => {
  const token = getAccessToken();

  return {
    headers: {
      ...prevContext.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError((errorContext: any) => {
  const { graphQLErrors, networkError, operation, forward } = errorContext;
  const messages = (graphQLErrors ?? []).map((error: any) => error.message || "");
  const codes = (graphQLErrors ?? [])
    .map((error: any) =>
      typeof error.extensions?.code === "string" ? error.extensions.code : ""
    )
    .filter(Boolean);

  const networkMessage =
    typeof (networkError as { message?: string } | undefined)?.message === "string"
      ? (networkError as { message?: string }).message ?? ""
      : "";
  const mustRefresh =
    shouldAttemptRefresh(messages, codes) || /401|unauthorized/i.test(networkMessage);
  const wasRetried = Boolean(operation.getContext().__wasRetried);

  if (!mustRefresh || wasRetried) {
    return;
  }

  return new Observable((observer) => {
    const retryWithToken = (token: string | null) => {
      if (!token) {
        observer.error(new Error("Unauthorized"));
        return;
      }

      operation.setContext(({ headers = {} }) => ({
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
        },
        __wasRetried: true,
      }));

      const subscription = forward(operation).subscribe({
        next: (value: any) => observer.next(value),
        error: (error: any) => observer.error(error),
        complete: () => observer.complete(),
      });

      return () => subscription.unsubscribe();
    };

    if (isRefreshing) {
      pendingResolvers.push((token) => {
        retryWithToken(token);
      });
      return;
    }

    isRefreshing = true;

    void requestTokenRefresh()
      .then((token) => {
        isRefreshing = false;
        resolvePending(token);
        retryWithToken(token);
      })
      .catch((error) => {
        isRefreshing = false;
        clearAuthTokens();
        resolvePending(null);
        observer.error(error);
      });
  });
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
