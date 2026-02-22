import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendError } from "../utils/api-response.js";

export function notFoundHandler(req: Request, res: Response) {
  return sendError(
    res,
    StatusCodes.NOT_FOUND,
    `Route not found: ${req.method} ${req.originalUrl}`,
    "ROUTE_NOT_FOUND"
  );
}
