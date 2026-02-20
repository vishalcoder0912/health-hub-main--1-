import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth, requireRoles } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import * as controller from "./patients.controller.js";
import { createPatientSchema, patientIdParamSchema, updatePatientSchema } from "./patients.schema.js";

export const patientsRouter = Router();

const privilegedRoles = [UserRole.admin, UserRole.doctor, UserRole.receptionist, UserRole.nurse];

patientsRouter.use(requireAuth);

patientsRouter.get("/", requireRoles(privilegedRoles), controller.listPatients);
patientsRouter.get("/:id", validate({ params: patientIdParamSchema }), requireRoles(privilegedRoles), controller.getPatientById);
patientsRouter.post("/", validate({ body: createPatientSchema }), requireRoles([UserRole.admin, UserRole.receptionist]), controller.createPatient);
patientsRouter.patch("/:id", validate({ params: patientIdParamSchema, body: updatePatientSchema }), requireRoles([UserRole.admin, UserRole.receptionist]), controller.updatePatient);
patientsRouter.delete("/:id", validate({ params: patientIdParamSchema }), requireRoles([UserRole.admin]), controller.deletePatient);
