-- =============================================================================
-- Medicare HMS - Production Schema for Supabase
-- Creation order: Extensions → Enums → Tables → Indexes → Functions → Triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 2. ENUM TYPES (must exist before any table uses them)
-- -----------------------------------------------------------------------------
CREATE TYPE user_role_enum AS ENUM (
  'admin',
  'doctor',
  'reception',
  'nurse',
  'pharmacy',
  'laboratory',
  'billing',
  'patient',
  'bloodbank'
);

CREATE TYPE appointment_status_enum AS ENUM (
  'scheduled',
  'completed',
  'cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
  'paid',
  'unpaid'
);

CREATE TYPE lab_status_enum AS ENUM (
  'pending',
  'processing',
  'completed'
);

-- -----------------------------------------------------------------------------
-- 3. TABLES (parent tables first, no forward references)
-- -----------------------------------------------------------------------------

-- 3.1 departments (no FK)
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.2 users (depends on departments)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.3 patients (no FK to custom tables)
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  blood_group VARCHAR(5) CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  emergency_contact VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.4 doctors (depends on users, departments)
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  specialization VARCHAR(255) NOT NULL,
  license_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.5 appointments (depends on patients, doctors)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status_enum NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.6 prescriptions (depends on patients, doctors, appointments)
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  notes TEXT,
  prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.7 lab_reports (depends on patients, appointments)
CREATE TABLE lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  test_name VARCHAR(255) NOT NULL,
  status lab_status_enum NOT NULL DEFAULT 'pending',
  result_data JSONB,
  reported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.8 inventory (depends on departments)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  unit VARCHAR(50) NOT NULL DEFAULT 'unit',
  reorder_level INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.9 invoices (depends on patients, appointments)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  payment_status payment_status_enum NOT NULL DEFAULT 'unpaid',
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3.10 blood_bank (depends on patients; blood_group column defined here)
CREATE TABLE blood_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  quantity_ml INTEGER NOT NULL CHECK (quantity_ml > 0),
  record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('donation','request','issue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 4. INDEXES (after all tables exist; only on existing columns)
-- -----------------------------------------------------------------------------

-- users
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- patients
CREATE INDEX idx_patients_blood_group ON patients(blood_group);

-- doctors
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_department_id ON doctors(department_id);

-- appointments
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- prescriptions
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_appointment_id ON prescriptions(appointment_id);

-- lab_reports
CREATE INDEX idx_lab_reports_patient_id ON lab_reports(patient_id);
CREATE INDEX idx_lab_reports_appointment_id ON lab_reports(appointment_id);
CREATE INDEX idx_lab_reports_status ON lab_reports(status);
CREATE INDEX idx_lab_reports_result_data ON lab_reports USING GIN (result_data);

-- inventory
CREATE INDEX idx_inventory_department_id ON inventory(department_id);
CREATE INDEX idx_inventory_stock_quantity ON inventory(stock_quantity);
CREATE INDEX idx_inventory_category ON inventory(category);

-- invoices
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_appointment_id ON invoices(appointment_id);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);

-- blood_bank
CREATE INDEX idx_blood_bank_patient_id ON blood_bank(patient_id);
CREATE INDEX idx_blood_bank_blood_group ON blood_bank(blood_group);

-- -----------------------------------------------------------------------------
-- 5. FUNCTIONS (before triggers that use them)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. TRIGGERS (BEFORE UPDATE on each table with updated_at)
-- -----------------------------------------------------------------------------

CREATE TRIGGER set_updated_at_departments
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_doctors
  BEFORE UPDATE ON doctors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_prescriptions
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_lab_reports
  BEFORE UPDATE ON lab_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_inventory
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_blood_bank
  BEFORE UPDATE ON blood_bank
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 7. RLS COMMENTS (policies not implemented; enable RLS in app as needed)
-- -----------------------------------------------------------------------------

COMMENT ON TABLE departments IS 'RLS: restrict by role; admin can manage all.';
COMMENT ON TABLE users IS 'RLS: users see own row; admin sees all.';
COMMENT ON TABLE patients IS 'RLS: staff by role; patients see own record only.';
COMMENT ON TABLE doctors IS 'RLS: align with users and departments access.';
COMMENT ON TABLE appointments IS 'RLS: doctors see own; patients see own; reception sees all.';
COMMENT ON TABLE prescriptions IS 'RLS: doctors and pharmacy; patients own only.';
COMMENT ON TABLE lab_reports IS 'RLS: laboratory and doctors; patients own only.';
COMMENT ON TABLE inventory IS 'RLS: pharmacy/inventory roles by department.';
COMMENT ON TABLE invoices IS 'RLS: billing and patients (own only).';
COMMENT ON TABLE blood_bank IS 'RLS: bloodbank role; restrict sensitive fields.';
