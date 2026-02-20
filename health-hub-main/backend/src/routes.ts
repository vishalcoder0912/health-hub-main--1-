import { Router } from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { patientsRouter } from "./modules/patients/patients.routes.js";
import { appointmentsRouter } from "./modules/appointments/appointments.routes.js";
import { collectionsRouter } from "./modules/collections/collections.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/patients", patientsRouter);
apiRouter.use("/appointments", appointmentsRouter);
apiRouter.use("/collections", collectionsRouter);
