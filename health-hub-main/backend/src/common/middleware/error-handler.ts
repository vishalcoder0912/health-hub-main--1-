import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  if (err instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.issues[0]?.message ?? "Validation error"
    });
  }

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal server error"
  });
}
