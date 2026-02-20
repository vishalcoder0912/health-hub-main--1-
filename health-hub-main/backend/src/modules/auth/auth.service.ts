import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../common/utils/api-error.js";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

function signTokens(userId: string, role: UserRole): TokenPair {
  const accessToken = jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });

  const refreshToken = jwt.sign({ role }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });

  return { accessToken, refreshToken };
}

export async function register(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      passwordHash,
      phone: input.phone,
      role: UserRole.patient
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true
    }
  });

  const tokens = signTokens(user.id, user.role);
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash }
  });

  return { user, tokens };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
  }

  const tokens = signTokens(user.id, user.role);
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash, lastLoginAt: new Date() }
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt
    },
    tokens
  };
}

export async function refreshToken(refreshToken: string) {
  let payload: { sub: string; role: UserRole };

  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string; role: UserRole };
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.refreshTokenHash) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token not recognized");
  }

  const validToken = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!validToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token mismatch");
  }

  const tokens = signTokens(user.id, user.role);
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash }
  });

  return tokens;
}

export async function logout(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null }
  });
}
