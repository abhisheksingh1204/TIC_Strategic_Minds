"use client";

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  Observable,
  
} from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "@/lib/auth";

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || "/api",
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
  messages.some((msg) => /unauthorized|expired|invalid/i.test(msg)) ||
  codes.includes("UNAUTHENTICATED");

const requestTokenRefresh = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL || "/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: refreshMutation,
      variables: { refreshToken },
    }),
  });

  const payload = await response.json();
  const nextAccessToken = payload?.data?.refreshToken?.accessToken as string | undefined;
  const nextRefreshToken = payload?.data?.refreshToken?.refreshToken as string | undefined;

  if (!nextAccessToken || !nextRefreshToken) {
    clearAuthTokens();
    return null;
  }

  setAuthTokens(nextAccessToken, nextRefreshToken);
  return nextAccessToken;
};

const authLink = new SetContextLink((prevContext, operation) => {
  const token = getAccessToken();

  return {
    headers: {
      ...prevContext.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, operation, forward, networkError }) => {
  const messages = (graphQLErrors ?? []).map((err) => err.message || "");
  const codes = (graphQLErrors ?? [])
    .map((err) => (typeof err.extensions?.code === "string" ? err.extensions.code : ""))
    .filter(Boolean);

  const networkUnauthorized =
    typeof (networkError as { message?: string } | undefined)?.message === "string" &&
    /401|unauthorized/i.test((networkError as { message?: string }).message ?? "");
  const mustRefresh = shouldAttemptRefresh(messages, codes) || networkUnauthorized;
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
        next: (value) => observer.next(value),
        error: (err) => observer.error(err),
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
    requestTokenRefresh()
      .then((token) => {
        isRefreshing = false;
        resolvePending(token);
        retryWithToken(token);
      })
      .catch((err) => {
        isRefreshing = false;
        resolvePending(null);
        observer.error(err);
      });
  });
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
