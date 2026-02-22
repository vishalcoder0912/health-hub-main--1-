/**
 * Medicare HMS – Supabase table row types (match 001_medicare_hms_schema.sql)
 */

export type UserRoleEnum =
  | 'admin'
  | 'doctor'
  | 'reception'
  | 'nurse'
  | 'pharmacy'
  | 'laboratory'
  | 'billing'
  | 'patient'
  | 'bloodbank';

export type AppointmentStatusEnum = 'scheduled' | 'completed' | 'cancelled';
export type PaymentStatusEnum = 'paid' | 'unpaid';
export type LabStatusEnum = 'pending' | 'processing' | 'completed';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  department_id: string | null;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRoleEnum;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientRow {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  blood_group: BloodGroup | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorRow {
  id: string;
  user_id: string;
  department_id: string;
  specialization: string;
  license_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: AppointmentStatusEnum;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  notes: string | null;
  prescribed_at: string;
  created_at: string;
  updated_at: string;
}

export interface LabReportRow {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  test_name: string;
  status: LabStatusEnum;
  result_data: Record<string, unknown> | null;
  reported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryRow {
  id: string;
  department_id: string | null;
  item_name: string;
  category: string;
  stock_quantity: number;
  unit: string;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRow {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  amount: number;
  payment_status: PaymentStatusEnum;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloodBankRow {
  id: string;
  patient_id: string | null;
  blood_group: BloodGroup;
  quantity_ml: number;
  record_type: 'donation' | 'request' | 'issue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TableRowMap = {
  departments: DepartmentRow;
  users: UserRow;
  patients: PatientRow;
  doctors: DoctorRow;
  appointments: AppointmentRow;
  prescriptions: PrescriptionRow;
  lab_reports: LabReportRow;
  inventory: InventoryRow;
  invoices: InvoiceRow;
  blood_bank: BloodBankRow;
};

export type TableName = keyof TableRowMap;
