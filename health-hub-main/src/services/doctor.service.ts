import { RealtimeChannel } from '@supabase/supabase-js';
import { Appointment, LabTest } from '@/types';
import { supabase } from '@/utils/supabase';

type Row = Record<string, unknown>;

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
  status: 'active' | 'completed' | 'cancelled';
}

export interface DoctorMedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  visitType: 'consultation' | 'follow-up' | 'emergency' | 'routine-checkup';
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

const TABLES = {
  appointments: 'appointments',
  patients: 'patients',
  prescriptions: 'prescriptions',
  labTests: 'lab_tests',
  labTestsFallback: 'labTests',
  medicalRecords: 'medical_records',
  medicalRecordsFallback: 'medicalRecords',
};

function field<T = string>(row: Row, ...keys: string[]): T | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

function requiredString(row: Row, ...keys: string[]): string {
  return String(field(row, ...keys) ?? '');
}

function arrayValue<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function normalizeAppointment(row: Row): Appointment {
  return {
    id: requiredString(row, 'id'),
    patientId: requiredString(row, 'patientId', 'patient_id'),
    patientName: requiredString(row, 'patientName', 'patient_name'),
    doctorId: requiredString(row, 'doctorId', 'doctor_id'),
    doctorName: requiredString(row, 'doctorName', 'doctor_name'),
    department: requiredString(row, 'department'),
    date: requiredString(row, 'date'),
    time: requiredString(row, 'time'),
    status: (field(row, 'status') as Appointment['status']) ?? 'scheduled',
    type: (field(row, 'type') as Appointment['type']) ?? 'opd',
    tokenNumber: field<number>(row, 'tokenNumber', 'token_number'),
    notes: (field<string>(row, 'notes') ?? undefined) || undefined,
  };
}

function normalizeLabTest(row: Row): LabTest {
  return {
    id: requiredString(row, 'id'),
    patientId: requiredString(row, 'patientId', 'patient_id'),
    patientName: requiredString(row, 'patientName', 'patient_name'),
    doctorId: requiredString(row, 'doctorId', 'doctor_id'),
    doctorName: requiredString(row, 'doctorName', 'doctor_name'),
    testName: requiredString(row, 'testName', 'test_name'),
    testType: requiredString(row, 'testType', 'test_type'),
    status: (field(row, 'status') as LabTest['status']) ?? 'requested',
    requestDate: requiredString(row, 'requestDate', 'request_date'),
    completedDate: field<string>(row, 'completedDate', 'completed_date') ?? undefined,
    result: field<string>(row, 'result') ?? undefined,
    reportUrl: field<string>(row, 'reportUrl', 'report_url') ?? undefined,
    cost: Number(field(row, 'cost') ?? 0),
    notes: field<string>(row, 'notes') ?? undefined,
  };
}

function normalizePrescription(row: Row): DoctorPrescription {
  return {
    id: requiredString(row, 'id'),
    patientId: requiredString(row, 'patientId', 'patient_id'),
    patientName: requiredString(row, 'patientName', 'patient_name'),
    doctorId: requiredString(row, 'doctorId', 'doctor_id'),
    doctorName: requiredString(row, 'doctorName', 'doctor_name'),
    date: requiredString(row, 'date'),
    diagnosis: requiredString(row, 'diagnosis'),
    notes: requiredString(row, 'notes'),
    status: (field(row, 'status') as DoctorPrescription['status']) ?? 'active',
    items: arrayValue<DoctorPrescriptionItem>(field(row, 'items'), []),
  };
}

function normalizeMedicalRecord(row: Row): DoctorMedicalRecord {
  const vitals = field<Row>(row, 'vitals') ?? {};

  return {
    id: requiredString(row, 'id'),
    patientId: requiredString(row, 'patientId', 'patient_id'),
    patientName: requiredString(row, 'patientName', 'patient_name'),
    doctorId: requiredString(row, 'doctorId', 'doctor_id'),
    doctorName: requiredString(row, 'doctorName', 'doctor_name'),
    date: requiredString(row, 'date'),
    visitType: (field(row, 'visitType', 'visit_type') as DoctorMedicalRecord['visitType']) ?? 'consultation',
    chiefComplaint: requiredString(row, 'chiefComplaint', 'chief_complaint'),
    symptoms: arrayValue<string>(field(row, 'symptoms'), []),
    vitals: {
      bloodPressure: requiredString(vitals, 'bloodPressure', 'blood_pressure'),
      temperature: requiredString(vitals, 'temperature'),
      pulse: requiredString(vitals, 'pulse'),
      weight: requiredString(vitals, 'weight'),
      height: requiredString(vitals, 'height'),
    },
    diagnosis: requiredString(row, 'diagnosis'),
    treatment: requiredString(row, 'treatment'),
    notes: requiredString(row, 'notes'),
  };
}

function appointmentPayload(payload: Partial<Omit<Appointment, 'id'>>): Row {
  return {
    patientId: payload.patientId,
    patientName: payload.patientName,
    doctorId: payload.doctorId,
    doctorName: payload.doctorName,
    department: payload.department,
    date: payload.date,
    time: payload.time,
    status: payload.status,
    type: payload.type,
    tokenNumber: payload.tokenNumber,
    notes: payload.notes ?? null,
  };
}

function appointmentPayloadSnake(payload: Partial<Omit<Appointment, 'id'>>): Row {
  return {
    patient_id: payload.patientId,
    patient_name: payload.patientName,
    doctor_id: payload.doctorId,
    doctor_name: payload.doctorName,
    department: payload.department,
    date: payload.date,
    time: payload.time,
    status: payload.status,
    type: payload.type,
    token_number: payload.tokenNumber,
    notes: payload.notes ?? null,
  };
}

function labPayload(payload: Partial<Omit<LabTest, 'id'>>): Row {
  return {
    patientId: payload.patientId,
    patientName: payload.patientName,
    doctorId: payload.doctorId,
    doctorName: payload.doctorName,
    testName: payload.testName,
    testType: payload.testType,
    status: payload.status,
    requestDate: payload.requestDate,
    completedDate: payload.completedDate ?? null,
    result: payload.result ?? null,
    reportUrl: payload.reportUrl ?? null,
    cost: payload.cost,
    notes: payload.notes ?? null,
  };
}

function labPayloadSnake(payload: Partial<Omit<LabTest, 'id'>>): Row {
  return {
    patient_id: payload.patientId,
    patient_name: payload.patientName,
    doctor_id: payload.doctorId,
    doctor_name: payload.doctorName,
    test_name: payload.testName,
    test_type: payload.testType,
    status: payload.status,
    request_date: payload.requestDate,
    completed_date: payload.completedDate ?? null,
    result: payload.result ?? null,
    report_url: payload.reportUrl ?? null,
    cost: payload.cost,
    notes: payload.notes ?? null,
  };
}

function prescriptionPayload(payload: Partial<Omit<DoctorPrescription, 'id'>>): Row {
  return {
    patientId: payload.patientId,
    patientName: payload.patientName,
    doctorId: payload.doctorId,
    doctorName: payload.doctorName,
    date: payload.date,
    diagnosis: payload.diagnosis,
    notes: payload.notes,
    status: payload.status,
    items: payload.items ?? [],
  };
}

function prescriptionPayloadSnake(payload: Partial<Omit<DoctorPrescription, 'id'>>): Row {
  return {
    patient_id: payload.patientId,
    patient_name: payload.patientName,
    doctor_id: payload.doctorId,
    doctor_name: payload.doctorName,
    date: payload.date,
    diagnosis: payload.diagnosis,
    notes: payload.notes,
    status: payload.status,
    items: payload.items ?? [],
  };
}

function medicalRecordPayload(payload: Partial<Omit<DoctorMedicalRecord, 'id'>>): Row {
  return {
    patientId: payload.patientId,
    patientName: payload.patientName,
    doctorId: payload.doctorId,
    doctorName: payload.doctorName,
    date: payload.date,
    visitType: payload.visitType,
    chiefComplaint: payload.chiefComplaint,
    symptoms: payload.symptoms ?? [],
    vitals: payload.vitals,
    diagnosis: payload.diagnosis,
    treatment: payload.treatment,
    notes: payload.notes,
  };
}

function medicalRecordPayloadSnake(payload: Partial<Omit<DoctorMedicalRecord, 'id'>>): Row {
  return {
    patient_id: payload.patientId,
    patient_name: payload.patientName,
    doctor_id: payload.doctorId,
    doctor_name: payload.doctorName,
    date: payload.date,
    visit_type: payload.visitType,
    chief_complaint: payload.chiefComplaint,
    symptoms: payload.symptoms ?? [],
    vitals: payload.vitals,
    diagnosis: payload.diagnosis,
    treatment: payload.treatment,
    notes: payload.notes,
  };
}

async function selectWithFallback(primary: string, fallback: string, orderBy?: { col: string; asc?: boolean }) {
  let primaryQuery = supabase.from(primary).select('*');
  if (orderBy) {
    primaryQuery = primaryQuery.order(orderBy.col, { ascending: orderBy.asc ?? true });
  }

  const first = await primaryQuery;
  if (!first.error) return { table: primary, rows: (first.data as Row[]) ?? [] };

  let fallbackQuery = supabase.from(fallback).select('*');
  if (orderBy) {
    fallbackQuery = fallbackQuery.order(orderBy.col, { ascending: orderBy.asc ?? true });
  }

  const second = await fallbackQuery;
  if (second.error) throw second.error;

  return { table: fallback, rows: (second.data as Row[]) ?? [] };
}

async function insertWithFallback(
  table: string,
  payload: Row,
  payloadSnake: Row,
  fallbackTable?: string
): Promise<Row> {
  const first = await supabase.from(table).insert([payload]).select('*').single();
  if (!first.error) return first.data as Row;

  const second = await supabase.from(table).insert([payloadSnake]).select('*').single();
  if (!second.error) return second.data as Row;

  if (fallbackTable) {
    const third = await supabase.from(fallbackTable).insert([payload]).select('*').single();
    if (!third.error) return third.data as Row;

    const fourth = await supabase.from(fallbackTable).insert([payloadSnake]).select('*').single();
    if (!fourth.error) return fourth.data as Row;

    throw fourth.error;
  }

  throw second.error;
}

async function updateWithFallback(
  table: string,
  id: string,
  payload: Row,
  payloadSnake: Row,
  fallbackTable?: string
): Promise<Row> {
  const first = await supabase.from(table).update(payload).eq('id', id).select('*').single();
  if (!first.error) return first.data as Row;

  const second = await supabase.from(table).update(payloadSnake).eq('id', id).select('*').single();
  if (!second.error) return second.data as Row;

  if (fallbackTable) {
    const third = await supabase.from(fallbackTable).update(payload).eq('id', id).select('*').single();
    if (!third.error) return third.data as Row;

    const fourth = await supabase.from(fallbackTable).update(payloadSnake).eq('id', id).select('*').single();
    if (!fourth.error) return fourth.data as Row;

    throw fourth.error;
  }

  throw second.error;
}

async function deleteWithFallback(table: string, id: string, fallbackTable?: string): Promise<void> {
  const first = await supabase.from(table).delete().eq('id', id);
  if (!first.error) return;

  if (fallbackTable) {
    const second = await supabase.from(fallbackTable).delete().eq('id', id);
    if (!second.error) return;
    throw second.error;
  }

  throw first.error;
}

function filterByDoctorId<T extends { doctorId: string }>(rows: T[], doctorId?: string): T[] {
  if (!doctorId) return rows;
  return rows.filter((row) => row.doctorId === doctorId);
}

export async function fetchDoctorAppointments(doctorId?: string): Promise<Appointment[]> {
  let query = supabase
    .from(TABLES.appointments)
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (doctorId) {
    query = query.or(`doctorId.eq.${doctorId},doctor_id.eq.${doctorId}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data as Row[]) ?? []).map(normalizeAppointment);
}

export async function createDoctorAppointment(payload: Omit<Appointment, 'id'>): Promise<Appointment> {
  const row = await insertWithFallback(
    TABLES.appointments,
    appointmentPayload(payload),
    appointmentPayloadSnake(payload)
  );

  return normalizeAppointment(row);
}

export async function updateDoctorAppointment(
  id: string,
  payload: Partial<Omit<Appointment, 'id'>>
): Promise<Appointment> {
  const row = await updateWithFallback(
    TABLES.appointments,
    id,
    appointmentPayload(payload),
    appointmentPayloadSnake(payload)
  );

  return normalizeAppointment(row);
}

export async function deleteDoctorAppointment(id: string): Promise<void> {
  await deleteWithFallback(TABLES.appointments, id);
}

export async function fetchDoctorLabTests(doctorId?: string): Promise<LabTest[]> {
  const { rows } = await selectWithFallback(TABLES.labTests, TABLES.labTestsFallback, {
    col: 'requestDate',
    asc: false,
  });

  const normalized = rows.map(normalizeLabTest);
  return filterByDoctorId(normalized, doctorId);
}

export async function createDoctorLabTest(payload: Omit<LabTest, 'id'>): Promise<LabTest> {
  const row = await insertWithFallback(
    TABLES.labTests,
    labPayload(payload),
    labPayloadSnake(payload),
    TABLES.labTestsFallback
  );

  return normalizeLabTest(row);
}

export async function updateDoctorLabTest(id: string, payload: Partial<Omit<LabTest, 'id'>>): Promise<LabTest> {
  const row = await updateWithFallback(
    TABLES.labTests,
    id,
    labPayload(payload),
    labPayloadSnake(payload),
    TABLES.labTestsFallback
  );

  return normalizeLabTest(row);
}

export async function deleteDoctorLabTest(id: string): Promise<void> {
  await deleteWithFallback(TABLES.labTests, id, TABLES.labTestsFallback);
}

export async function fetchDoctorPrescriptions(doctorId?: string): Promise<DoctorPrescription[]> {
  const { data, error } = await supabase.from(TABLES.prescriptions).select('*').order('date', { ascending: false });
  if (error) throw error;

  const rows = ((data as Row[]) ?? []).map(normalizePrescription);
  return filterByDoctorId(rows, doctorId);
}

export async function createDoctorPrescription(
  payload: Omit<DoctorPrescription, 'id'>
): Promise<DoctorPrescription> {
  const row = await insertWithFallback(
    TABLES.prescriptions,
    prescriptionPayload(payload),
    prescriptionPayloadSnake(payload)
  );

  return normalizePrescription(row);
}

export async function updateDoctorPrescription(
  id: string,
  payload: Partial<Omit<DoctorPrescription, 'id'>>
): Promise<DoctorPrescription> {
  const row = await updateWithFallback(
    TABLES.prescriptions,
    id,
    prescriptionPayload(payload),
    prescriptionPayloadSnake(payload)
  );

  return normalizePrescription(row);
}

export async function deleteDoctorPrescription(id: string): Promise<void> {
  await deleteWithFallback(TABLES.prescriptions, id);
}

export async function fetchDoctorMedicalRecords(doctorId?: string): Promise<DoctorMedicalRecord[]> {
  const { rows } = await selectWithFallback(TABLES.medicalRecords, TABLES.medicalRecordsFallback, {
    col: 'date',
    asc: false,
  });

  const normalized = rows.map(normalizeMedicalRecord);
  return filterByDoctorId(normalized, doctorId);
}

export async function createDoctorMedicalRecord(
  payload: Omit<DoctorMedicalRecord, 'id'>
): Promise<DoctorMedicalRecord> {
  const row = await insertWithFallback(
    TABLES.medicalRecords,
    medicalRecordPayload(payload),
    medicalRecordPayloadSnake(payload),
    TABLES.medicalRecordsFallback
  );

  return normalizeMedicalRecord(row);
}

export async function updateDoctorMedicalRecord(
  id: string,
  payload: Partial<Omit<DoctorMedicalRecord, 'id'>>
): Promise<DoctorMedicalRecord> {
  const row = await updateWithFallback(
    TABLES.medicalRecords,
    id,
    medicalRecordPayload(payload),
    medicalRecordPayloadSnake(payload),
    TABLES.medicalRecordsFallback
  );

  return normalizeMedicalRecord(row);
}

export async function deleteDoctorMedicalRecord(id: string): Promise<void> {
  await deleteWithFallback(TABLES.medicalRecords, id, TABLES.medicalRecordsFallback);
}

export async function fetchPatientOptions(): Promise<DoctorPatientOption[]> {
  const first = await supabase.from(TABLES.patients).select('id, name');
  if (!first.error) {
    return ((first.data as Array<{ id: string; name?: string }>) ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? '',
    }));
  }

  const second = await supabase.from(TABLES.patients).select('id, full_name');
  if (second.error) throw second.error;

  return ((second.data as Array<{ id: string; full_name?: string }>) ?? []).map((row) => ({
    id: row.id,
    name: row.full_name ?? '',
  }));
}

export function subscribeDoctorPortal(
  doctorId: string | undefined,
  onChange: () => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`doctor-portal-${doctorId ?? 'all'}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.appointments }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.prescriptions }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.labTests }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.labTestsFallback }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.medicalRecords }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.medicalRecordsFallback }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
