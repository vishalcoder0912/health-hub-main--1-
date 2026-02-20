import { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import * as CollectionsService from "./collections.service.js";

export const bootstrap = asyncHandler(async (_req: Request, res: Response) => {
  const data = await CollectionsService.bootstrapCollections();
  return sendSuccess(res, data, "Collections bootstrapped");
});

export const getCollection = asyncHandler(async (req: Request, res: Response) => {
  const data = await CollectionsService.getCollection(String(req.params.key));
  return sendSuccess(res, data, "Collection fetched");
});

export const setCollection = asyncHandler(async (req: Request, res: Response) => {
  const data = await CollectionsService.setCollection(String(req.params.key), req.body?.items ?? []);
  return sendSuccess(res, data, "Collection saved");
});
