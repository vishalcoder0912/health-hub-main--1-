import { z } from "zod";

export const patientIdParamSchema = z.object({
  id: z.string().min(1)
});

export const createPatientSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["male", "female", "other"]),
  bloodGroup: z.string().min(2).max(3),
  address: z.string().min(5).max(400),
  emergencyContact: z.string().min(7).max(20)
});

export const updatePatientSchema = createPatientSchema.partial();
