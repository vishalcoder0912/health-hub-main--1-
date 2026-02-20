import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { apiRouter } from "./routes.js";
import { notFoundHandler } from "./common/middleware/not-found.js";
import { errorHandler } from "./common/middleware/error-handler.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger
  })
);

app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
