import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth, requireRoles } from "../../common/middleware/auth.js";
import * as controller from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, controller.getMe);
usersRouter.get("/", requireAuth, requireRoles([UserRole.admin]), controller.listUsers);
