import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/api-error.js";

type ValidationTarget = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export function validate(target: ValidationTarget) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const bodyResult = target.body?.safeParse(req.body);
    if (bodyResult && !bodyResult.success) {
      return next(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          bodyResult.error.issues[0]?.message ?? "Invalid body",
          "INVALID_BODY"
        )
      );
    }

    const paramsResult = target.params?.safeParse(req.params);
    if (paramsResult && !paramsResult.success) {
      return next(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          paramsResult.error.issues[0]?.message ?? "Invalid params",
          "INVALID_PARAMS"
        )
      );
    }

    const queryResult = target.query?.safeParse(req.query);
    if (queryResult && !queryResult.success) {
      return next(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          queryResult.error.issues[0]?.message ?? "Invalid query",
          "INVALID_QUERY"
        )
      );
    }

    return next();
  };
}
