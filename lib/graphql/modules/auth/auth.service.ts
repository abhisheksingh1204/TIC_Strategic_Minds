import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import User from "@/models/User.model";

/**
 * Token generators
 */
const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
};

/**
 * Register Service
 */
export const registerUser = async ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new GraphQLError("Email already in use", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    passwordHash: hashedPassword,
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user,
  };
};

/**
 * Login Service
 */
export const loginUser = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new GraphQLError("Invalid credentials", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new GraphQLError("Invalid credentials", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user,
  };
};

/**
 * Refresh Token Service
 */
export const refreshAuthToken = async (refreshToken: string) => {
  try {
    const payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
    ) as { userId: string };

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new Error();
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    };
  } catch {
    throw new GraphQLError("Invalid refresh token", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
};

/**
 * Get Current User Service
 */
export const getCurrentUser = async (userId?: string) => {
  if (!userId) return null;

  const user = await User.findById(userId);
  return user;
};

export const updateMyName = async (
  userId: string | undefined,
  name: string,
) => {
  if (!userId) {
    throw new GraphQLError("Unauthorized", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new GraphQLError("Name is required", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { name: trimmed } },
    { new: true },
  );

  if (!user) {
    throw new GraphQLError("User not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  return user;
};
