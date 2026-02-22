/**
 * Map Supabase DB rows to UI shapes (camelCase, optional display fields).
 * Use for pages that expect the existing UI types (Patient, Appointment, etc.).
 */

import type { PatientRow, AppointmentRow, DepartmentRow, InvoiceRow, LabReportRow, BloodBankRow } from './database.types';
import type { Patient, Appointment, Department, Bill } from '@/types';

export function mapPatientRowToPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    dateOfBirth: row.date_of_birth,
    gender: row.gender as 'male' | 'female' | 'other',
    bloodGroup: row.blood_group ?? '',
    address: row.address ?? '',
    emergencyContact: row.emergency_contact ?? '',
    medicalHistory: [],
    createdAt: row.created_at,
  };
}

export function mapDepartmentRowToDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    head: '',
    description: row.description ?? '',
    doctorCount: 0,
    nurseCount: 0,
  };
}

export function mapAppointmentRowToAppointment(
  row: AppointmentRow,
  patientName: string,
  doctorName: string,
  departmentName?: string
): Appointment {
  const d = new Date(row.appointment_date);
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName,
    doctorId: row.doctor_id,
    doctorName,
    department: departmentName ?? '',
    date: d.toISOString().slice(0, 10),
    time: d.toTimeString().slice(0, 5),
    status: row.status === 'scheduled' ? 'scheduled' : row.status === 'completed' ? 'completed' : 'cancelled',
    type: 'opd',
    notes: row.notes ?? undefined,
  };
}

export function mapInvoiceRowToBill(row: InvoiceRow, patientName: string): Bill {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName,
    date: row.due_date ?? row.created_at.slice(0, 10),
    items: [],
    subtotal: Number(row.amount),
    discount: 0,
    tax: 0,
    total: Number(row.amount),
    status: row.payment_status === 'paid' ? 'paid' : 'pending',
  };
}

export function mapLabReportRowToLabTest(
  row: LabReportRow,
  patientName: string
): { id: string; patientId: string; patientName: string; testName: string; status: string; requestDate: string; result?: string } {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName,
    testName: row.test_name,
    status: row.status,
    requestDate: row.created_at.slice(0, 10),
    result: row.result_data ? JSON.stringify(row.result_data) : undefined,
  };
}

export function mapBloodBankRowToDisplay(row: BloodBankRow): { id: string; blood_group: string; quantity_ml: number; record_type: string; patient_id: string | null } {
  return {
    id: row.id,
    blood_group: row.blood_group,
    quantity_ml: row.quantity_ml,
    record_type: row.record_type,
    patient_id: row.patient_id,
  };
}
