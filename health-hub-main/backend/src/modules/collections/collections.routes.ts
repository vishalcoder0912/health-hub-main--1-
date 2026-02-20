import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.js";
import * as controller from "./collections.controller.js";

export const collectionsRouter = Router();

collectionsRouter.use(requireAuth);
collectionsRouter.get("/bootstrap", controller.bootstrap);
collectionsRouter.get("/:key", controller.getCollection);
collectionsRouter.put("/:key", controller.setCollection);
