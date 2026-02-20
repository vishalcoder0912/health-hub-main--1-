import { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import * as AppointmentsService from "./appointments.service.js";

export const listAppointments = asyncHandler(async (_req: Request, res: Response) => {
  const appointments = await AppointmentsService.listAppointments();
  return sendSuccess(res, appointments, "Appointments fetched");
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
