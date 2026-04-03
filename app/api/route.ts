import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";

import { schema } from "@/lib/graphql/schema";
import { createContext } from "@/lib/graphql/context";

/**
 * Apollo Server instance
 */
const server = new ApolloServer({
  schema,
  introspection: true,
});

/**
 * GraphQL handler for Next.js App Router
 */
// const handler = startServerAndCreateNextHandler(server, {
//   context: async () => ({}),
// });

const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: async (req: NextRequest) => {
    return createContext(req);
  },
});

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
