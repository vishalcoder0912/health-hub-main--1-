import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import { ApiError } from "../../common/utils/api-error.js";
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

export const getCollectionItem = asyncHandler(async (req: Request, res: Response) => {
  const data = await CollectionsService.getCollectionItem(String(req.params.key), String(req.params.id));
  if (!data) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Collection item not found", "COLLECTION_ITEM_NOT_FOUND");
  }
  return sendSuccess(res, data, "Collection item fetched");
});

export const createCollectionItem = asyncHandler(async (req: Request, res: Response) => {
  const data = await CollectionsService.createCollectionItem(String(req.params.key), req.body);
  return sendSuccess(res, data, "Collection item created", StatusCodes.CREATED);
});

export const updateCollectionItem = asyncHandler(async (req: Request, res: Response) => {
  const data = await CollectionsService.updateCollectionItem(
    String(req.params.key),
    String(req.params.id),
    req.body
  );
  return sendSuccess(res, data, "Collection item updated");
});

export const deleteCollectionItem = asyncHandler(async (req: Request, res: Response) => {
  await CollectionsService.deleteCollectionItem(String(req.params.key), String(req.params.id));
  return sendSuccess(res, null, "Collection item deleted");
});
