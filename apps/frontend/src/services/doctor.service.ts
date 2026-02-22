import { RealtimeChannel } from "@supabase/supabase-js";
import { Appointment, LabTest } from "@/types";
import { apiRequest } from "@/lib/api";
import {
  createCollectionItem,
  deleteCollectionItem,
  fetchCollection,
  updateCollectionItem
} from "@/services/collections.service";
import { supabase } from "@/utils/supabase";

type Row = Record<string, unknown>;

type BackendAppointment = {
  id: string;
  patientId: string;
  doctorId: string;
  department: string;
  date: string;
  time: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  type: "opd" | "follow_up" | "emergency";
  notes?: string | null;
  patient?: { id: string; fullName: string } | null;
  doctor?: { id: string; fullName: string; department?: string | null } | null;
};

export type DoctorPatientOption = {
  id: string;
  name: string;
};

export interface DoctorPrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface DoctorPrescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  items: DoctorPrescriptionItem[];
  diagnosis: string;
  notes: string;
  status: "active" | "completed" | "cancelled";
}

export interface DoctorMedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  visitType: "consultation" | "follow-up" | "emergency" | "routine-checkup";
  chiefComplaint: string;
  symptoms: string[];
  vitals: {
    bloodPressure: string;
    temperature: string;
    pulse: string;
    weight: string;
    height: string;
  };
  diagnosis: string;
  treatment: string;
  notes: string;
}

function field<T = string>(row: Row, ...keys: string[]): T | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

function requiredString(row: Row, ...keys: string[]): string {
  return String(field(row, ...keys) ?? "");
}

function arrayValue<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function toUiAppointmentStatus(status: BackendAppointment["status"]): Appointment["status"] {
  switch (status) {
    case "in_progress":
      return "in-progress";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "scheduled";
  }
}

function toBackendAppointmentStatus(status: Appointment["status"]): BackendAppointment["status"] {
  switch (status) {
    case "in-progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "scheduled";
  }
}

function toUiAppointmentType(type: BackendAppointment["type"]): Appointment["type"] {
  if (type === "follow_up") return "follow-up";
  return type;
}

function toBackendAppointmentType(type: Appointment["type"]): BackendAppointment["type"] {
  if (type === "follow-up") return "follow_up";
  return type;
}

function normalizeAppointment(row: BackendAppointment): Appointment {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patient?.fullName || "",
    doctorId: row.doctorId,
    doctorName: row.doctor?.fullName || "",
    department: row.department || row.doctor?.department || "",
    date: row.date.split("T")[0],
    time: row.time,
    status: toUiAppointmentStatus(row.status),
    type: toUiAppointmentType(row.type),
    notes: row.notes ?? undefined
  };
}

function appointmentPayload(payload: Partial<Omit<Appointment, "id">>): Partial<BackendAppointment> {
  return {
    patientId: payload.patientId,
    doctorId: payload.doctorId,
    department: payload.department,
    date: payload.date,
    time: payload.time,
    status: payload.status ? toBackendAppointmentStatus(payload.status) : undefined,
    type: payload.type ? toBackendAppointmentType(payload.type) : undefined,
    notes: payload.notes ?? undefined
  };
}

function normalizeLabTest(row: Row): LabTest {
  return {
    id: requiredString(row, "id"),
    patientId: requiredString(row, "patientId", "patient_id"),
    patientName: requiredString(row, "patientName", "patient_name"),
    doctorId: requiredString(row, "doctorId", "doctor_id"),
    doctorName: requiredString(row, "doctorName", "doctor_name"),
    testName: requiredString(row, "testName", "test_name"),
    testType: requiredString(row, "testType", "test_type"),
    status: (field(row, "status") as LabTest["status"]) ?? "requested",
    requestDate: requiredString(row, "requestDate", "request_date"),
    completedDate: field<string>(row, "completedDate", "completed_date") ?? undefined,
    result: field<string>(row, "result") ?? undefined,
    reportUrl: field<string>(row, "reportUrl", "report_url") ?? undefined,
    cost: Number(field(row, "cost") ?? 0),
    notes: field<string>(row, "notes") ?? undefined
  };
}

function normalizePrescription(row: Row): DoctorPrescription {
  return {
    id: requiredString(row, "id"),
    patientId: requiredString(row, "patientId", "patient_id"),
    patientName: requiredString(row, "patientName", "patient_name"),
    doctorId: requiredString(row, "doctorId", "doctor_id"),
    doctorName: requiredString(row, "doctorName", "doctor_name"),
    date: requiredString(row, "date"),
    diagnosis: requiredString(row, "diagnosis"),
    notes: requiredString(row, "notes"),
    status: (field(row, "status") as DoctorPrescription["status"]) ?? "active",
    items: arrayValue<DoctorPrescriptionItem>(field(row, "items"), [])
  };
}

function normalizeMedicalRecord(row: Row): DoctorMedicalRecord {
  const vitals = (field<Row>(row, "vitals") ?? {}) as Record<string, unknown>;

  return {
    id: requiredString(row, "id"),
    patientId: requiredString(row, "patientId", "patient_id"),
    patientName: requiredString(row, "patientName", "patient_name"),
    doctorId: requiredString(row, "doctorId", "doctor_id"),
    doctorName: requiredString(row, "doctorName", "doctor_name"),
    date: requiredString(row, "date"),
    visitType: (field(row, "visitType", "visit_type") as DoctorMedicalRecord["visitType"]) ?? "consultation",
    chiefComplaint: requiredString(row, "chiefComplaint", "chief_complaint"),
    symptoms: arrayValue<string>(field(row, "symptoms"), []),
    vitals: {
      bloodPressure: requiredString(vitals, "bloodPressure", "blood_pressure"),
      temperature: requiredString(vitals, "temperature"),
      pulse: requiredString(vitals, "pulse"),
      weight: requiredString(vitals, "weight"),
      height: requiredString(vitals, "height")
    },
    diagnosis: requiredString(row, "diagnosis"),
    treatment: requiredString(row, "treatment"),
    notes: requiredString(row, "notes")
  };
}

function filterByDoctorId<T extends { doctorId: string }>(rows: T[], doctorId?: string): T[] {
  if (!doctorId) return rows;
  return rows.filter((row) => row.doctorId === doctorId);
}

function sortByDateDesc<T>(rows: T[], getDate: (row: T) => string): T[] {
  return [...rows].sort((a, b) => getDate(b).localeCompare(getDate(a)));
}

export async function fetchDoctorAppointments(doctorId?: string): Promise<Appointment[]> {
  const query = doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : "";
  const rows = await apiRequest<BackendAppointment[]>(`/appointments${query}`);
  return rows.map(normalizeAppointment);
}

export async function createDoctorAppointment(payload: Omit<Appointment, "id">): Promise<Appointment> {
  const row = await apiRequest<BackendAppointment>("/appointments", {
    method: "POST",
    body: JSON.stringify(appointmentPayload(payload))
  });
  return normalizeAppointment(row);
}

export async function updateDoctorAppointment(
  id: string,
  payload: Partial<Omit<Appointment, "id">>
): Promise<Appointment> {
  const row = await apiRequest<BackendAppointment>(`/appointments/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(appointmentPayload(payload))
  });
  return normalizeAppointment(row);
}

export async function deleteDoctorAppointment(id: string): Promise<void> {
  await apiRequest(`/appointments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchDoctorLabTests(doctorId?: string): Promise<LabTest[]> {
  const rows = await fetchCollection<Row>("labTests");
  const normalized = rows.map(normalizeLabTest);
  return sortByDateDesc(filterByDoctorId(normalized, doctorId), (item) => item.requestDate);
}

export async function createDoctorLabTest(payload: Omit<LabTest, "id">): Promise<LabTest> {
  const row = await createCollectionItem<Row>("labTests", payload as unknown as Row);
  return normalizeLabTest(row);
}

export async function updateDoctorLabTest(id: string, payload: Partial<Omit<LabTest, "id">>): Promise<LabTest> {
  const row = await updateCollectionItem<Row>("labTests", id, payload as unknown as Partial<Row>);
  return normalizeLabTest(row);
}

export async function deleteDoctorLabTest(id: string): Promise<void> {
  await deleteCollectionItem("labTests", id);
}

export async function fetchDoctorPrescriptions(doctorId?: string): Promise<DoctorPrescription[]> {
  const rows = await fetchCollection<Row>("prescriptions");
  const normalized = rows.map(normalizePrescription);
  return sortByDateDesc(filterByDoctorId(normalized, doctorId), (item) => item.date);
}

export async function createDoctorPrescription(
  payload: Omit<DoctorPrescription, "id">
): Promise<DoctorPrescription> {
  const row = await createCollectionItem<Row>("prescriptions", payload as unknown as Row);
  return normalizePrescription(row);
}

export async function updateDoctorPrescription(
  id: string,
  payload: Partial<Omit<DoctorPrescription, "id">>
): Promise<DoctorPrescription> {
  const row = await updateCollectionItem<Row>("prescriptions", id, payload as unknown as Partial<Row>);
  return normalizePrescription(row);
}

export async function deleteDoctorPrescription(id: string): Promise<void> {
  await deleteCollectionItem("prescriptions", id);
}

export async function fetchDoctorMedicalRecords(doctorId?: string): Promise<DoctorMedicalRecord[]> {
  const rows = await fetchCollection<Row>("medicalRecords");
  const normalized = rows.map(normalizeMedicalRecord);
  return sortByDateDesc(filterByDoctorId(normalized, doctorId), (item) => item.date);
}

export async function createDoctorMedicalRecord(
  payload: Omit<DoctorMedicalRecord, "id">
): Promise<DoctorMedicalRecord> {
  const row = await createCollectionItem<Row>("medicalRecords", payload as unknown as Row);
  return normalizeMedicalRecord(row);
}

export async function updateDoctorMedicalRecord(
  id: string,
  payload: Partial<Omit<DoctorMedicalRecord, "id">>
): Promise<DoctorMedicalRecord> {
  const row = await updateCollectionItem<Row>("medicalRecords", id, payload as unknown as Partial<Row>);
  return normalizeMedicalRecord(row);
}

export async function deleteDoctorMedicalRecord(id: string): Promise<void> {
  await deleteCollectionItem("medicalRecords", id);
}

export async function fetchPatientOptions(): Promise<DoctorPatientOption[]> {
  const rows = await fetchCollection<{ id: string; name?: string; fullName?: string }>("patients");
  return rows.map((row) => ({
    id: row.id,
    name: row.name || row.fullName || ""
  }));
}

export function subscribeDoctorPortal(doctorId: string | undefined, onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`doctor-portal-${doctorId ?? "all"}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "Appointment" }, onChange)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "data_collections", filter: "key=eq.labTests" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "data_collections", filter: "key=eq.prescriptions" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "data_collections", filter: "key=eq.medicalRecords" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "DataCollection", filter: "key=eq.labTests" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "DataCollection", filter: "key=eq.prescriptions" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "DataCollection", filter: "key=eq.medicalRecords" },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
