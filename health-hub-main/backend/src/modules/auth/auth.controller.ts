import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import { ApiError } from "../../common/utils/api-error.js";
import * as AuthService from "./auth.service.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await AuthService.register(req.body);
  return sendSuccess(res, { user, ...tokens }, "Registration successful", StatusCodes.CREATED);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await AuthService.login(req.body);
  return sendSuccess(res, { user, ...tokens }, "Login successful");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "refreshToken is required");
  }

  const tokens = await AuthService.refreshToken(refreshToken);
  return sendSuccess(res, tokens, "Token refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
  }

  await AuthService.logout(req.user.userId);
  return sendSuccess(res, null, "Logged out");
});
