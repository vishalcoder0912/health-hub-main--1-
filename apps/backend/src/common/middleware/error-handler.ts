import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error.js";
import { sendError } from "../utils/api-response.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.message, err.code);
  }

  if (err instanceof ZodError) {
    return sendError(
      res,
      StatusCodes.BAD_REQUEST,
      err.issues[0]?.message ?? "Validation error",
      "VALIDATION_ERROR"
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return sendError(
        res,
        StatusCodes.CONFLICT,
        "A record with the same unique value already exists",
        "UNIQUE_CONSTRAINT_VIOLATION"
      );
    }

    if (err.code === "P2025") {
      return sendError(
        res,
        StatusCodes.NOT_FOUND,
        "Requested record was not found",
        "RECORD_NOT_FOUND"
      );
    }
  }

  return sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    "Internal server error",
    "INTERNAL_SERVER_ERROR"
  );
}
