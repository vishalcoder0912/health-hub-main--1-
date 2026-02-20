import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth, requireRoles } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import * as controller from "./appointments.controller.js";
import { appointmentIdParamSchema, createAppointmentSchema, updateAppointmentSchema } from "./appointments.schema.js";

export const appointmentsRouter = Router();

appointmentsRouter.use(requireAuth);
appointmentsRouter.get("/", requireRoles([UserRole.admin, UserRole.doctor, UserRole.receptionist]), controller.listAppointments);
appointmentsRouter.post("/", validate({ body: createAppointmentSchema }), requireRoles([UserRole.admin, UserRole.receptionist]), controller.createAppointment);
appointmentsRouter.patch("/:id", validate({ params: appointmentIdParamSchema, body: updateAppointmentSchema }), requireRoles([UserRole.admin, UserRole.doctor, UserRole.receptionist]), controller.updateAppointment);
appointmentsRouter.delete("/:id", validate({ params: appointmentIdParamSchema }), requireRoles([UserRole.admin, UserRole.receptionist]), controller.deleteAppointment);
