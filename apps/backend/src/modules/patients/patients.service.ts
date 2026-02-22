import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";
import {
  deleteSupabaseRowById,
  isSupabaseSyncEnabled,
  upsertSupabaseRows
} from "../../integrations/supabase-sync.js";

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

type PatientRecord = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  bloodGroup: string;
  address: string;
  emergencyContact: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapPatientToSupabaseCamel(patient: PatientRecord) {
  return {
    id: patient.id,
    name: patient.fullName,
    email: patient.email,
    phone: patient.phone,
    dateOfBirth: patient.dateOfBirth.toISOString().slice(0, 10),
    gender: patient.gender,
    bloodGroup: patient.bloodGroup,
    address: patient.address,
    emergencyContact: patient.emergencyContact,
    medicalHistory: [],
    createdAt: patient.createdAt.toISOString(),
    created_at: patient.createdAt.toISOString(),
    updated_at: patient.updatedAt.toISOString()
  };
}

function mapPatientToSupabaseSnake(patient: PatientRecord) {
  return {
    id: patient.id,
    user_id: null,
    date_of_birth: patient.dateOfBirth.toISOString().slice(0, 10),
    gender: patient.gender,
    blood_type: patient.bloodGroup,
    address: patient.address,
    city: null,
    state: null,
    zip_code: null,
    emergency_contact: patient.emergencyContact,
    emergency_phone: patient.phone,
    medical_history: "",
    allergies: "",
    created_at: patient.createdAt.toISOString(),
    updated_at: patient.updatedAt.toISOString()
  };
}

async function syncPatientToSupabase(patient: PatientRecord): Promise<void> {
  if (!isSupabaseSyncEnabled()) {
    return;
  }

  const camelSynced = await upsertSupabaseRows("patients", [mapPatientToSupabaseCamel(patient)]);
  if (camelSynced) {
    return;
  }

  await upsertSupabaseRows("patients", [mapPatientToSupabaseSnake(patient)]);
}

export async function listPatients() {
  return prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getPatientById(id: string) {
  return prisma.patient.findUnique({ where: { id } });
}

export async function createPatient(input: CreatePatientInput) {
  const created = await prisma.patient.create({
    data: {
      ...input,
      email: input.email?.toLowerCase()
    }
  });
  await syncPatientToSupabase(created);
  return created;
}

export async function updatePatient(id: string, input: Partial<CreatePatientInput>) {
  const data: Prisma.PatientUpdateInput = { ...input };
  if (input.email) {
    data.email = input.email.toLowerCase();
  }
  const updated = await prisma.patient.update({ where: { id }, data });
  await syncPatientToSupabase(updated);
  return updated;
}

export async function deletePatient(id: string) {
  const deleted = await prisma.patient.delete({ where: { id } });
  await deleteSupabaseRowById("patients", id);
  return deleted;
}
