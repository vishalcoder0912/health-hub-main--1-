import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";

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

export async function listAppointments() {
  return prisma.appointment.findMany({
    include: {
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, fullName: true, department: true } }
    },
    orderBy: [{ date: "desc" }, { time: "desc" }]
  });
}

export async function createAppointment(input: CreateAppointmentInput) {
  return prisma.appointment.create({
    data: input,
    include: {
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, fullName: true, department: true } }
    }
  });
}

export async function updateAppointment(id: string, input: Partial<CreateAppointmentInput>) {
  const data: Prisma.AppointmentUpdateInput = { ...input };
  return prisma.appointment.update({
    where: { id },
    data,
    include: {
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, fullName: true, department: true } }
    }
  });
}

export async function deleteAppointment(id: string) {
  return prisma.appointment.delete({ where: { id } });
}
