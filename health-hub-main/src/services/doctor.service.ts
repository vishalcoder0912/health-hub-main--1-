import { supabase } from '@/utils/supabase';
import { Appointment } from '@/types';

type AppointmentRow = {
  id: string;
  patientId?: string;
  patient_id?: string;
  patientName?: string;
  patient_name?: string;
  doctorId?: string;
  doctor_id?: string;
  doctorName?: string;
  doctor_name?: string;
  department?: string;
  date: string;
  time: string;
  status: Appointment['status'];
  type: Appointment['type'];
  tokenNumber?: number;
  token_number?: number;
  notes?: string | null;
};

type PatientRow = {
  id: string;
  name?: string;
  full_name?: string;
};

function normalizeAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientId: row.patientId || row.patient_id || '',
    patientName: row.patientName || row.patient_name || '',
    doctorId: row.doctorId || row.doctor_id || '',
    doctorName: row.doctorName || row.doctor_name || '',
    department: row.department || '',
    date: row.date,
    time: row.time,
    status: row.status,
    type: row.type,
    tokenNumber: row.tokenNumber || row.token_number || undefined,
    notes: row.notes || undefined,
  };
}

function mapForWrite(input: Partial<Appointment>) {
  return {
    patientId: input.patientId,
    patientName: input.patientName,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    department: input.department,
    date: input.date,
    time: input.time,
    status: input.status,
    type: input.type,
    tokenNumber: input.tokenNumber,
    notes: input.notes || null,
  };
}

function mapForWriteSnake(input: Partial<Appointment>) {
  return {
    patient_id: input.patientId,
    patient_name: input.patientName,
    doctor_id: input.doctorId,
    doctor_name: input.doctorName,
    department: input.department,
    date: input.date,
    time: input.time,
    status: input.status,
    type: input.type,
    token_number: input.tokenNumber,
    notes: input.notes || null,
  };
}

export async function fetchDoctorAppointments(doctorId?: string): Promise<Appointment[]> {
  let query = supabase.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true });
  if (doctorId) {
    query = query.or(`doctorId.eq.${doctorId},doctor_id.eq.${doctorId}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return ((data as AppointmentRow[]) || []).map(normalizeAppointment);
}

export async function createDoctorAppointment(payload: Omit<Appointment, 'id'>): Promise<Appointment> {
  const first = await supabase.from('appointments').insert([mapForWrite(payload)]).select('*').single();
  if (!first.error) return normalizeAppointment(first.data as AppointmentRow);

  const second = await supabase.from('appointments').insert([mapForWriteSnake(payload)]).select('*').single();
  if (second.error) throw second.error;
  return normalizeAppointment(second.data as AppointmentRow);
}

export async function updateDoctorAppointment(id: string, payload: Partial<Omit<Appointment, 'id'>>): Promise<Appointment> {
  const first = await supabase.from('appointments').update(mapForWrite(payload)).eq('id', id).select('*').single();
  if (!first.error) return normalizeAppointment(first.data as AppointmentRow);

  const second = await supabase.from('appointments').update(mapForWriteSnake(payload)).eq('id', id).select('*').single();
  if (second.error) throw second.error;
  return normalizeAppointment(second.data as AppointmentRow);
}

export async function deleteDoctorAppointment(id: string): Promise<void> {
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchPatientOptions(): Promise<Array<{ id: string; name: string }>> {
  const first = await supabase.from('patients').select('id,name');
  if (!first.error) {
    return ((first.data as PatientRow[]) || []).map((p) => ({ id: p.id, name: p.name || '' }));
  }

  const second = await supabase.from('patients').select('id,full_name');
  if (second.error) throw second.error;
  return ((second.data as PatientRow[]) || []).map((p) => ({ id: p.id, name: p.full_name || '' }));
}
