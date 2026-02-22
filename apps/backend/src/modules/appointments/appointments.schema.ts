import { z } from "zod";

export const appointmentIdParamSchema = z.object({
  id: z.string().min(1)
});

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  department: z.string().min(2).max(120),
  date: z.coerce.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
  type: z.enum(["opd", "follow_up", "emergency"]).default("opd"),
  notes: z.string().max(500).optional()
});

export const updateAppointmentSchema = createAppointmentSchema.partial();
