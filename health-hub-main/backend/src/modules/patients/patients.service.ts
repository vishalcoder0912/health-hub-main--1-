import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";

type CreatePatientInput = {
  fullName: string;
  email?: string;
  phone: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  bloodGroup: string;
  address: string;
  emergencyContact: string;
};

export async function listPatients() {
  return prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getPatientById(id: string) {
  return prisma.patient.findUnique({ where: { id } });
}

export async function createPatient(input: CreatePatientInput) {
  return prisma.patient.create({
    data: {
      ...input,
      email: input.email?.toLowerCase()
    }
  });
}

export async function updatePatient(id: string, input: Partial<CreatePatientInput>) {
  const data: Prisma.PatientUpdateInput = { ...input };
  if (input.email) {
    data.email = input.email.toLowerCase();
  }
  return prisma.patient.update({ where: { id }, data });
}

export async function deletePatient(id: string) {
  return prisma.patient.delete({ where: { id } });
}
