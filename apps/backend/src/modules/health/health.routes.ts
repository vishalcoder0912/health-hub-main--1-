import { Router } from "express";
import { sendSuccess } from "../../common/utils/api-response.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  return sendSuccess(
    res,
    {
      status: "UP",
      service: "health-hub-backend",
      timestamp: new Date().toISOString()
    },
    "Service healthy"
  );
});
