import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import * as controller from "./collections.controller.js";
import {
  collectionItemBodySchema,
  collectionItemParamSchema,
  collectionKeyParamSchema,
  setCollectionSchema
} from "./collections.schema.js";

export const collectionsRouter = Router();

collectionsRouter.use(requireAuth);
collectionsRouter.get("/bootstrap", controller.bootstrap);
collectionsRouter.get("/:key/:id", validate({ params: collectionItemParamSchema }), controller.getCollectionItem);
collectionsRouter.post("/:key", validate({ params: collectionKeyParamSchema, body: collectionItemBodySchema }), controller.createCollectionItem);
collectionsRouter.put("/:key/:id", validate({ params: collectionItemParamSchema, body: collectionItemBodySchema }), controller.updateCollectionItem);
collectionsRouter.delete("/:key/:id", validate({ params: collectionItemParamSchema }), controller.deleteCollectionItem);
collectionsRouter.get("/:key", validate({ params: collectionKeyParamSchema }), controller.getCollection);
collectionsRouter.put("/:key", validate({ params: collectionKeyParamSchema, body: setCollectionSchema }), controller.setCollection);
