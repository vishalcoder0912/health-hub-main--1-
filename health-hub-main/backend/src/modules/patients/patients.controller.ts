import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import { ApiError } from "../../common/utils/api-error.js";
import * as PatientsService from "./patients.service.js";

export const listPatients = asyncHandler(async (_req: Request, res: Response) => {
  const patients = await PatientsService.listPatients();
  return sendSuccess(res, patients, "Patients fetched");
});

export const getPatientById = asyncHandler(async (req: Request, res: Response) => {
  const patient = await PatientsService.getPatientById(String(req.params.id));
  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Patient not found");
  }
  return sendSuccess(res, patient, "Patient fetched");
});

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await PatientsService.createPatient(req.body);
  return sendSuccess(res, patient, "Patient created", StatusCodes.CREATED);
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await PatientsService.updatePatient(String(req.params.id), req.body);
  return sendSuccess(res, patient, "Patient updated");
});

export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  await PatientsService.deletePatient(String(req.params.id));
  return sendSuccess(res, null, "Patient deleted");
});
