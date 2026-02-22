import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { ApiError } from "../utils/api-error.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

  if (!token) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, "Missing access token", "MISSING_ACCESS_TOKEN"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; role: UserRole };
    req.user = { userId: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired token", "INVALID_ACCESS_TOKEN"));
  }
}

export function requireRoles(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(
          StatusCodes.FORBIDDEN,
          "You do not have access to this resource",
          "FORBIDDEN_RESOURCE"
        )
      );
    }
    return next();
  };
}
