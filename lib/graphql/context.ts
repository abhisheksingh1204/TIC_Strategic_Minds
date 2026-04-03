import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

export interface GraphQLContext {
  req: NextRequest | Request;
  userId?: string;
}

export const createContext = async (
  req: NextRequest | Request,
): Promise<GraphQLContext> => {
  try {
    await connectDB();
  } catch (err) {
    console.error("DB connection failed:", err);
    throw new Error("Database unavailable");
  }

  const authHeader =
    req.headers.get("authorization") ??
    req.headers.get("Authorization") ??
    req.headers.get("x-access-token");

  let userId: string | undefined;

  if (authHeader) {
    const headerValue = authHeader.trim();
    const bearerMatch = headerValue.match(/^Bearer\s+(.+)$/i);
    const tokenCandidate = bearerMatch ? bearerMatch[1] : headerValue;
    const unquotedToken = tokenCandidate.replace(/^"(.+)"$/, "$1").trim();
    const token = unquotedToken.split(/\s+/).pop() ?? "";
    const invalidLiteral = !token || token === "undefined" || token === "null";

    if (invalidLiteral) {
      return { req, userId: undefined };
    }

    try {
      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
        userId: string;
      };

      userId = payload.userId;
    } catch {
      userId = undefined;
    }
  }

  return {
    req,
    userId,
  };
};
