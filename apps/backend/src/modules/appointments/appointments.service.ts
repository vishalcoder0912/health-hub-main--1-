import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";
import {
  deleteSupabaseRowById,
  isSupabaseSyncEnabled,
  upsertSupabaseRows
} from "../../integrations/supabase-sync.js";

type CreateAppointmentInput = {
  patientId: string;
  doctorId: string;
  department: string;
  date: Date;
  time: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  type: "opd" | "follow_up" | "emergency";
  notes?: string;
};

type AppointmentWithRelations = {
  id: string;
  patientId: string;
  doctorId: string;
  department: string;
  date: Date;
  time: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  type: "opd" | "follow_up" | "emergency";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; fullName: string } | null;
  doctor: { id: string; fullName: string; department: string | null } | null;
};

function toSupabaseStatus(status: AppointmentWithRelations["status"]): string {
  if (status === "in_progress") return "in-progress";
  return status;
}

function toSupabaseType(type: AppointmentWithRelations["type"]): string {
  if (type === "follow_up") return "follow-up";
  return type;
}

function mapAppointmentToSupabaseCamel(appointment: AppointmentWithRelations) {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    patientName: appointment.patient?.fullName ?? "",
    doctorId: appointment.doctorId,
    doctorName: appointment.doctor?.fullName ?? "",
    department: appointment.department,
    date: appointment.date.toISOString().slice(0, 10),
    time: appointment.time,
    status: toSupabaseStatus(appointment.status),
    type: toSupabaseType(appointment.type),
    notes: appointment.notes,
    created_at: appointment.createdAt.toISOString(),
    updated_at: appointment.updatedAt.toISOString()
  };
}

function mapAppointmentToSupabaseSnake(appointment: AppointmentWithRelations) {
  return {
    id: appointment.id,
    patient_id: appointment.patientId,
    doctor_id: appointment.doctorId,
    appointment_date: appointment.date.toISOString().slice(0, 10),
    appointment_time: appointment.time,
    reason_for_visit: appointment.department,
    notes: appointment.notes,
    status: appointment.status,
    created_at: appointment.createdAt.toISOString(),
    updated_at: appointment.updatedAt.toISOString()
  };
}

async function syncAppointmentToSupabase(appointment: AppointmentWithRelations): Promise<void> {
  if (!isSupabaseSyncEnabled()) {
    return;
  }

  const camelSynced = await upsertSupabaseRows("appointments", [
    mapAppointmentToSupabaseCamel(appointment)
  ]);
  if (camelSynced) {
    return;
  }

  await upsertSupabaseRows("appointments", [mapAppointmentToSupabaseSnake(appointment)]);
}

export async function listAppointments(doctorId?: string) {
  return prisma.appointment.findMany({
    where: doctorId ? { doctorId } : undefined,
    include: {
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, fullName: true, department: true } }
    },
    orderBy: [{ date: "desc" }, { time: "desc" }]
  });
}

export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, fullName: true, department: true } }
    }
  });
}

export async function createAppointment(input: CreateAppointmentInput) {
  const created = await prisma.appointment.create({
    data: input,
    include: {
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, fullName: true, department: true } }
    }
  });
  await syncAppointmentToSupabase(created);
  return created;
}

export async function updateAppointment(id: string, input: Partial<CreateAppointmentInput>) {
  const data: Prisma.AppointmentUpdateInput = { ...input };
  const updated = await prisma.appointment.update({
    where: { id },
    data,
    include: {
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, fullName: true, department: true } }
    }
  });
  await syncAppointmentToSupabase(updated);
  return updated;
}

export async function deleteAppointment(id: string) {
  const deleted = await prisma.appointment.delete({ where: { id } });
  await deleteSupabaseRowById("appointments", id);
  return deleted;
}
