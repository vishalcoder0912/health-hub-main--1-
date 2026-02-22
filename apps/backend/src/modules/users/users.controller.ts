import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import { ApiError } from "../../common/utils/api-error.js";
import * as UsersService from "./users.service.js";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized");
  }

  const me = await UsersService.getMe(req.user.userId);
  if (!me) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  return sendSuccess(res, me, "Profile fetched");
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await UsersService.listUsers();
  return sendSuccess(res, users, "Users fetched");
});
