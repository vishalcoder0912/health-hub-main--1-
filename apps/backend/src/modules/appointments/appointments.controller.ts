import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import { ApiError } from "../../common/utils/api-error.js";
import * as AppointmentsService from "./appointments.service.js";

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const doctorId =
    typeof req.query.doctorId === "string" && req.query.doctorId.length > 0
      ? req.query.doctorId
      : undefined;
  const appointments = await AppointmentsService.listAppointments(doctorId);
  return sendSuccess(res, appointments, "Appointments fetched");
});

export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await AppointmentsService.getAppointmentById(String(req.params.id));
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Appointment not found", "APPOINTMENT_NOT_FOUND");
  }
  return sendSuccess(res, appointment, "Appointment fetched");
});

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await AppointmentsService.createAppointment(req.body);
  return sendSuccess(res, appointment, "Appointment created", 201);
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await AppointmentsService.updateAppointment(String(req.params.id), req.body);
  return sendSuccess(res, appointment, "Appointment updated");
});

export const deleteAppointment = asyncHandler(async (req: Request, res: Response) => {
  await AppointmentsService.deleteAppointment(String(req.params.id));
  return sendSuccess(res, null, "Appointment deleted");
});
