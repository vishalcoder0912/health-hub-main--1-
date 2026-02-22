import { Response } from "express";

export type ApiErrorBody = {
  message: string;
  code: string;
};

export type ApiEnvelope<T> = {
  data: T | null;
  error: ApiErrorBody | null;
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  messageOrStatusCode?: string | number,
  statusCode = 200
) {
  const finalStatusCode =
    typeof messageOrStatusCode === "number" ? messageOrStatusCode : statusCode;

  return res.status(finalStatusCode).json({
    data,
    error: null
  } satisfies ApiEnvelope<T>);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code = "API_ERROR"
) {
  return res.status(statusCode).json({
    data: null,
    error: {
      message,
      code
    }
  } satisfies ApiEnvelope<null>);
}
