import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { requireAuth } from "../../common/middleware/auth.js";
import * as controller from "./auth.controller.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", validate({ body: registerSchema.shape.body }), controller.register);
authRouter.post("/login", validate({ body: loginSchema.shape.body }), controller.login);
authRouter.post("/refresh", validate({ body: refreshSchema.shape.body }), controller.refresh);
authRouter.post("/logout", requireAuth, controller.logout);
