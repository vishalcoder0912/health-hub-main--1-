-- Medicare HMS Supabase Schema
-- Run this in Supabase SQL Editor (single run is enough; script is idempotent).

create extension if not exists pgcrypto;

-- =========================================================
-- Core Tables
-- =========================================================

create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  email text unique,
  name text not null,
  role text not null default 'patient',
  phone text,
  department text,
  specialization text,
  avatar text,
  "createdAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (
    role in ('admin', 'doctor', 'receptionist', 'nurse', 'pharmacy', 'laboratory', 'billing', 'patient', 'bloodbank')
  )
);

create table if not exists public.user_profiles (
  id text primary key default gen_random_uuid()::text,
  "userId" text,
  "fullName" text,
  role text,
  department text,
  specialization text,
  phone text,
  avatar text,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.patients (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text,
  phone text,
  "dateOfBirth" date,
  gender text,
  "bloodGroup" text,
  address text,
  "emergencyContact" text,
  "medicalHistory" jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  head text,
  description text,
  "doctorCount" integer not null default 0,
  "nurseCount" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beds (
  id text primary key default gen_random_uuid()::text,
  "wardId" text,
  "wardName" text,
  "bedNumber" text,
  status text not null default 'available',
  "patientId" text,
  "patientName" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "patientName" text,
  "doctorId" text,
  "doctorName" text,
  department text,
  date date,
  "time" text,
  status text default 'scheduled',
  type text default 'opd',
  "tokenNumber" integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_collections (
  id text primary key default gen_random_uuid()::text,
  key text unique not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vitals (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "nurseId" text,
  "recordedAt" timestamptz,
  "bloodPressure" text,
  temperature numeric(6,2),
  pulse integer,
  "respiratoryRate" integer,
  "oxygenSaturation" integer,
  weight numeric(8,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Doctor + Lab + Billing + Pharmacy
-- =========================================================

create table if not exists public.medicines (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  "genericName" text,
  category text,
  manufacturer text,
  "batchNumber" text,
  "expiryDate" date,
  quantity integer not null default 0,
  "unitPrice" numeric(12,2) not null default 0,
  "reorderLevel" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prescriptions (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "patientName" text,
  "doctorId" text,
  "doctorName" text,
  date date,
  items jsonb not null default '[]'::jsonb,
  diagnosis text,
  notes text,
  status text default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_tests (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "patientName" text,
  "doctorId" text,
  "doctorName" text,
  "testName" text,
  "testType" text,
  status text default 'requested',
  "requestDate" date,
  "completedDate" date,
  result text,
  "reportUrl" text,
  cost numeric(12,2) default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_records (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "patientName" text,
  "doctorId" text,
  "doctorName" text,
  date date,
  "visitType" text,
  "chiefComplaint" text,
  symptoms jsonb not null default '[]'::jsonb,
  vitals jsonb not null default '{}'::jsonb,
  diagnosis text,
  treatment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bills (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "patientName" text,
  date date,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'pending',
  "paymentMethod" text,
  "insuranceClaim" boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id text primary key default gen_random_uuid()::text,
  supplier text,
  "orderDate" date,
  "expectedDelivery" date,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispense_records (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "patientName" text,
  "prescriptionId" text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  "paymentMethod" text,
  "dispensedAt" timestamptz,
  "dispensedBy" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Nurse + Notifications + Messaging
-- =========================================================

create table if not exists public.medication_schedule (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "patientName" text,
  "bedNumber" text,
  "medicineName" text,
  dosage text,
  route text,
  "scheduledTime" text,
  status text default 'pending',
  "administeredAt" text,
  "administeredBy" text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nursing_notes (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "patientName" text,
  "bedNumber" text,
  "nurseId" text,
  "nurseName" text,
  category text,
  content text,
  "createdAt" timestamptz not null default now(),
  shift text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nurse_alerts (
  id text primary key default gen_random_uuid()::text,
  type text,
  priority text,
  "patientId" text,
  "patientName" text,
  "bedNumber" text,
  title text,
  message text,
  "createdAt" timestamptz not null default now(),
  acknowledged boolean not null default false,
  "acknowledgedAt" text,
  "acknowledgedBy" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.doctor_notifications (
  id text primary key default gen_random_uuid()::text,
  type text,
  title text,
  message text,
  "time" timestamptz,
  read boolean not null default false,
  priority text default 'normal',
  "relatedId" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_conversations (
  id text primary key default gen_random_uuid()::text,
  "patientId" text,
  "doctorId" text,
  "doctorName" text,
  department text,
  "lastMessage" text,
  "lastMessageTime" text,
  unread boolean not null default false,
  "createdAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_messages (
  id text primary key default gen_random_uuid()::text,
  "conversationId" text,
  sender text,
  "senderId" text,
  "senderName" text,
  content text,
  "timestamp" text,
  "createdAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_attendance (
  id text primary key default gen_random_uuid()::text,
  "oddbodyId" text,
  "oddbodyName" text,
  role text,
  department text,
  status text,
  date date,
  "checkIn" text,
  "checkOut" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Blood Bank
-- =========================================================

create table if not exists public.blood_inventory (
  id text primary key default gen_random_uuid()::text,
  "bloodGroup" text,
  units integer not null default 0,
  "lastUpdated" date,
  "lowStockThreshold" integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_donors (
  id text primary key default gen_random_uuid()::text,
  name text,
  phone text,
  email text,
  "bloodGroup" text,
  "dateOfBirth" date,
  gender text,
  address text,
  "eligibleToDonate" boolean default true,
  "lastDonationDate" date,
  "nextEligibleDate" date,
  "totalDonations" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_collections (
  id text primary key default gen_random_uuid()::text,
  "donorId" text,
  "donorName" text,
  "bloodGroup" text,
  "collectionDate" date,
  quantity integer,
  "bagId" text,
  "screeningStatus" text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_tests (
  id text primary key default gen_random_uuid()::text,
  "bagId" text,
  "donorName" text,
  "bloodGroup" text,
  "testDate" date,
  "hivTest" text,
  "hepatitisB" text,
  "hepatitisC" text,
  syphilis text,
  malaria text,
  "overallStatus" text,
  "verifiedBy" text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_storage (
  id text primary key default gen_random_uuid()::text,
  "bagId" text,
  "bloodGroup" text,
  "storageLocation" text,
  "storedDate" date,
  "expiryDate" date,
  status text,
  "disposalDate" date,
  "disposalReason" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_issues (
  id text primary key default gen_random_uuid()::text,
  "bagId" text,
  "bloodGroup" text,
  "patientId" text,
  "patientName" text,
  "patientBloodGroup" text,
  "issuedDate" date,
  "issuedBy" text,
  purpose text,
  "isEmergency" boolean not null default false,
  "crossMatchResult" text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_requests (
  id text primary key default gen_random_uuid()::text,
  "requestedBy" text,
  "requestedByRole" text,
  "patientId" text,
  "patientName" text,
  "bloodGroup" text,
  units integer not null default 1,
  priority text,
  "requestDate" date,
  status text default 'pending',
  "approvedBy" text,
  "approvedDate" date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_activity_logs (
  id text primary key default gen_random_uuid()::text,
  action text,
  details text,
  "performedBy" text,
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- =========================================================
-- Compatibility Migration (legacy lowercase/snake_case -> camelCase)
-- =========================================================

do $$
begin
  -- appointments
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'doctorId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'doctorid') then
      execute 'alter table public.appointments rename column doctorid to "doctorId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'doctor_id') then
      execute 'alter table public.appointments rename column doctor_id to "doctorId"';
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'patientId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'patientid') then
      execute 'alter table public.appointments rename column patientid to "patientId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'patient_id') then
      execute 'alter table public.appointments rename column patient_id to "patientId"';
    end if;
  end if;

  -- prescriptions
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prescriptions' and column_name = 'doctorId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prescriptions' and column_name = 'doctorid') then
      execute 'alter table public.prescriptions rename column doctorid to "doctorId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prescriptions' and column_name = 'doctor_id') then
      execute 'alter table public.prescriptions rename column doctor_id to "doctorId"';
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prescriptions' and column_name = 'patientId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prescriptions' and column_name = 'patientid') then
      execute 'alter table public.prescriptions rename column patientid to "patientId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'prescriptions' and column_name = 'patient_id') then
      execute 'alter table public.prescriptions rename column patient_id to "patientId"';
    end if;
  end if;

  -- lab_tests
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lab_tests' and column_name = 'doctorId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lab_tests' and column_name = 'doctorid') then
      execute 'alter table public.lab_tests rename column doctorid to "doctorId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lab_tests' and column_name = 'doctor_id') then
      execute 'alter table public.lab_tests rename column doctor_id to "doctorId"';
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lab_tests' and column_name = 'patientId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lab_tests' and column_name = 'patientid') then
      execute 'alter table public.lab_tests rename column patientid to "patientId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lab_tests' and column_name = 'patient_id') then
      execute 'alter table public.lab_tests rename column patient_id to "patientId"';
    end if;
  end if;

  -- medical_records
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'medical_records' and column_name = 'doctorId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'medical_records' and column_name = 'doctorid') then
      execute 'alter table public.medical_records rename column doctorid to "doctorId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'medical_records' and column_name = 'doctor_id') then
      execute 'alter table public.medical_records rename column doctor_id to "doctorId"';
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'medical_records' and column_name = 'patientId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'medical_records' and column_name = 'patientid') then
      execute 'alter table public.medical_records rename column patientid to "patientId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'medical_records' and column_name = 'patient_id') then
      execute 'alter table public.medical_records rename column patient_id to "patientId"';
    end if;
  end if;

  -- patient_conversations
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patient_conversations' and column_name = 'doctorId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patient_conversations' and column_name = 'doctorid') then
      execute 'alter table public.patient_conversations rename column doctorid to "doctorId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patient_conversations' and column_name = 'doctor_id') then
      execute 'alter table public.patient_conversations rename column doctor_id to "doctorId"';
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patient_conversations' and column_name = 'patientId') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patient_conversations' and column_name = 'patientid') then
      execute 'alter table public.patient_conversations rename column patientid to "patientId"';
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patient_conversations' and column_name = 'patient_id') then
      execute 'alter table public.patient_conversations rename column patient_id to "patientId"';
    end if;
  end if;
end $$;

-- Ensure required access columns exist on already-created tables.
alter table if exists public.appointments add column if not exists "patientId" text;
alter table if exists public.appointments add column if not exists "doctorId" text;
alter table if exists public.prescriptions add column if not exists "patientId" text;
alter table if exists public.prescriptions add column if not exists "doctorId" text;
alter table if exists public.lab_tests add column if not exists "patientId" text;
alter table if exists public.lab_tests add column if not exists "doctorId" text;
alter table if exists public.medical_records add column if not exists "patientId" text;
alter table if exists public.medical_records add column if not exists "doctorId" text;
alter table if exists public.vitals add column if not exists "patientId" text;
alter table if exists public.bills add column if not exists "patientId" text;
alter table if exists public.user_profiles add column if not exists "userId" text;
alter table if exists public.patient_conversations add column if not exists "patientId" text;
alter table if exists public.patient_conversations add column if not exists "doctorId" text;
alter table if exists public.patient_messages add column if not exists "conversationId" text;
alter table if exists public.patient_messages add column if not exists "senderId" text;

-- =========================================================
-- Useful Indexes
-- =========================================================

create index if not exists idx_appointments_doctorid on public.appointments ("doctorId");
create index if not exists idx_appointments_patientid on public.appointments ("patientId");
create index if not exists idx_lab_tests_doctorid on public.lab_tests ("doctorId");
create index if not exists idx_lab_tests_patientid on public.lab_tests ("patientId");
create index if not exists idx_prescriptions_doctorid on public.prescriptions ("doctorId");
create index if not exists idx_prescriptions_patientid on public.prescriptions ("patientId");
create index if not exists idx_medical_records_doctorid on public.medical_records ("doctorId");
create index if not exists idx_medical_records_patientid on public.medical_records ("patientId");
create index if not exists idx_messages_conversation on public.patient_messages ("conversationId");
create index if not exists idx_staff_attendance_date on public.staff_attendance (date);

-- =========================================================
-- Sync auth.users -> public.users (so you can see auth user data in SQL table)
-- =========================================================

create or replace function public.sync_auth_user_to_public_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_role text;
begin
  safe_role := coalesce(new.raw_user_meta_data->>'role', 'patient');
  if safe_role not in ('admin', 'doctor', 'receptionist', 'nurse', 'pharmacy', 'laboratory', 'billing', 'patient', 'bloodbank') then
    safe_role := 'patient';
  end if;

  insert into public.users (
    id, email, name, role, "createdAt", created_at, updated_at
  )
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    safe_role,
    now(),
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    role = coalesce(excluded.role, public.users.role),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_changed on auth.users;
create trigger on_auth_user_changed
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_to_public_users();

-- =========================================================
-- Realtime + Secure RLS + Grants
-- =========================================================

create or replace function public.current_user_role()
returns text
language sql
stable
set search_path = public, auth
as $$
  select coalesce(
    auth.jwt()->'user_metadata'->>'role',
    auth.jwt()->'app_metadata'->>'role',
    ''
  );
$$;

create or replace function public.has_role(_roles text[])
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select public.current_user_role() = any(_roles);
$$;

create or replace function public.has_role(_roles character varying[])
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select public.current_user_role() = any(_roles::text[]);
$$;

grant execute on function public.current_user_role() to anon, authenticated, service_role;
grant execute on function public.has_role(text[]) to anon, authenticated, service_role;
grant execute on function public.has_role(character varying[]) to anon, authenticated, service_role;

do $$
declare
  tbl text;
  app_tables text[] := array[
    'users', 'user_profiles', 'patients', 'departments', 'beds', 'appointments', 'data_collections', 'vitals',
    'medicines', 'prescriptions', 'lab_tests', 'medical_records', 'bills',
    'purchase_orders', 'dispense_records', 'medication_schedule', 'nursing_notes',
    'nurse_alerts', 'doctor_notifications', 'patient_conversations', 'patient_messages',
    'staff_attendance', 'blood_inventory', 'blood_donors', 'blood_collections', 'blood_tests',
    'blood_storage', 'blood_issues', 'blood_requests', 'blood_activity_logs'
  ];
begin
  foreach tbl in array app_tables loop
    -- Realtime publication
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;

    -- RLS
    execute format('alter table public.%I enable row level security', tbl);

    -- Tighten grants: no anonymous access to business data.
    execute format('revoke all on public.%I from anon', tbl);
    execute format('revoke all on public.%I from authenticated', tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
    execute format('grant all privileges on public.%I to authenticated', tbl);
    execute format('grant all privileges on public.%I to service_role', tbl);
  end loop;
end $$;

-- Drop old permissive policies if they exist.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'users', 'user_profiles', 'patients', 'departments', 'beds', 'appointments', 'data_collections', 'vitals',
        'medicines', 'prescriptions', 'lab_tests', 'medical_records', 'bills',
        'purchase_orders', 'dispense_records', 'medication_schedule', 'nursing_notes',
        'nurse_alerts', 'doctor_notifications', 'patient_conversations', 'patient_messages',
        'staff_attendance', 'blood_inventory', 'blood_donors', 'blood_collections', 'blood_tests',
        'blood_storage', 'blood_issues', 'blood_requests', 'blood_activity_logs'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Admin access to everything.
do $$
declare
  tbl text;
  app_tables text[] := array[
    'users', 'user_profiles', 'patients', 'departments', 'beds', 'appointments', 'data_collections', 'vitals',
    'medicines', 'prescriptions', 'lab_tests', 'medical_records', 'bills',
    'purchase_orders', 'dispense_records', 'medication_schedule', 'nursing_notes',
    'nurse_alerts', 'doctor_notifications', 'patient_conversations', 'patient_messages',
    'staff_attendance', 'blood_inventory', 'blood_donors', 'blood_collections', 'blood_tests',
    'blood_storage', 'blood_issues', 'blood_requests', 'blood_activity_logs'
  ];
begin
  foreach tbl in array app_tables loop
    execute format(
      'create policy admin_full_access on public.%I for all to authenticated using (public.has_role(array[''admin'']::text[])) with check (public.has_role(array[''admin'']::text[]))',
      tbl
    );
  end loop;
end $$;

-- USERS
create policy users_select_self on public.users
for select to authenticated
using (id::text = auth.uid()::text);

create policy users_update_self on public.users
for update to authenticated
using (id::text = auth.uid()::text)
with check (id::text = auth.uid()::text);

-- USER PROFILES
create policy user_profiles_select_self on public.user_profiles
for select to authenticated
using ("userId"::text = auth.uid()::text or id::text = auth.uid()::text);

create policy user_profiles_write_self on public.user_profiles
for all to authenticated
using ("userId"::text = auth.uid()::text or id::text = auth.uid()::text)
with check ("userId"::text = auth.uid()::text or id::text = auth.uid()::text);

-- PATIENTS
create policy patients_select_staff on public.patients
for select to authenticated
using (public.has_role(array['admin','doctor','receptionist','nurse','laboratory','billing','pharmacy']::text[]));

create policy patients_select_self on public.patients
for select to authenticated
using (id::text = auth.uid()::text);

create policy patients_write_staff on public.patients
for all to authenticated
using (public.has_role(array['admin','receptionist','doctor','nurse']::text[]))
with check (public.has_role(array['admin','receptionist','doctor','nurse']::text[]));

-- DATA COLLECTIONS
create policy data_collections_select_access on public.data_collections
for select to authenticated
using (
  public.has_role(
    array['admin','doctor','receptionist','nurse','pharmacy','laboratory','billing','patient','bloodbank']::text[]
  )
);

create policy data_collections_write_access on public.data_collections
for all to authenticated
using (
  public.has_role(
    array['admin','doctor','receptionist','nurse','pharmacy','laboratory','billing','patient','bloodbank']::text[]
  )
)
with check (
  public.has_role(
    array['admin','doctor','receptionist','nurse','pharmacy','laboratory','billing','patient','bloodbank']::text[]
  )
);

-- DEPARTMENTS + BEDS
create policy departments_select_staff on public.departments
for select to authenticated
using (public.has_role(array['admin','doctor','receptionist','nurse','laboratory','billing','pharmacy','bloodbank']::text[]));

create policy beds_select_staff on public.beds
for select to authenticated
using (public.has_role(array['admin','doctor','receptionist','nurse','laboratory','billing','pharmacy','bloodbank']::text[]));

create policy beds_write_staff on public.beds
for all to authenticated
using (public.has_role(array['admin','receptionist','nurse']::text[]))
with check (public.has_role(array['admin','receptionist','nurse']::text[]));

-- APPOINTMENTS
create policy appointments_select_access on public.appointments
for select to authenticated
using (
  public.has_role(array['admin','doctor','receptionist','nurse','laboratory','billing']::text[])
  or "patientId"::text = auth.uid()::text
  or "doctorId"::text = auth.uid()::text
);

create policy appointments_write_staff on public.appointments
for all to authenticated
using (public.has_role(array['admin','doctor','receptionist','nurse']::text[]))
with check (public.has_role(array['admin','doctor','receptionist','nurse']::text[]));

-- DOCTOR/LAB DATA
create policy prescriptions_select_access on public.prescriptions
for select to authenticated
using (
  public.has_role(array['admin','doctor','nurse','laboratory','billing']::text[])
  or "patientId"::text = auth.uid()::text
  or "doctorId"::text = auth.uid()::text
);

create policy prescriptions_write_staff on public.prescriptions
for all to authenticated
using (public.has_role(array['admin','doctor','nurse']::text[]))
with check (public.has_role(array['admin','doctor','nurse']::text[]));

create policy lab_tests_select_access on public.lab_tests
for select to authenticated
using (
  public.has_role(array['admin','doctor','nurse','laboratory','billing']::text[])
  or "patientId"::text = auth.uid()::text
  or "doctorId"::text = auth.uid()::text
);

create policy lab_tests_write_staff on public.lab_tests
for all to authenticated
using (public.has_role(array['admin','doctor','laboratory','nurse']::text[]))
with check (public.has_role(array['admin','doctor','laboratory','nurse']::text[]));

create policy medical_records_select_access on public.medical_records
for select to authenticated
using (
  public.has_role(array['admin','doctor','nurse','laboratory']::text[])
  or "patientId"::text = auth.uid()::text
  or "doctorId"::text = auth.uid()::text
);

create policy medical_records_write_staff on public.medical_records
for all to authenticated
using (public.has_role(array['admin','doctor','nurse']::text[]))
with check (public.has_role(array['admin','doctor','nurse']::text[]));

create policy vitals_select_access on public.vitals
for select to authenticated
using (
  public.has_role(array['admin','doctor','nurse','laboratory']::text[])
  or "patientId"::text = auth.uid()::text
);

create policy vitals_write_staff on public.vitals
for all to authenticated
using (public.has_role(array['admin','nurse']::text[]))
with check (public.has_role(array['admin','nurse']::text[]));

create policy doctor_notifications_access on public.doctor_notifications
for all to authenticated
using (public.has_role(array['admin','doctor']::text[]))
with check (public.has_role(array['admin','doctor']::text[]));

-- BILLING
create policy bills_select_access on public.bills
for select to authenticated
using (
  public.has_role(array['admin','billing','receptionist']::text[])
  or "patientId"::text = auth.uid()::text
);

create policy bills_write_billing on public.bills
for all to authenticated
using (public.has_role(array['admin','billing','receptionist']::text[]))
with check (public.has_role(array['admin','billing','receptionist']::text[]));

-- PHARMACY
create policy medicines_select_access on public.medicines
for select to authenticated
using (public.has_role(array['admin','pharmacy','doctor','nurse','receptionist']::text[]));

create policy medicines_write_pharmacy on public.medicines
for all to authenticated
using (public.has_role(array['admin','pharmacy']::text[]))
with check (public.has_role(array['admin','pharmacy']::text[]));

create policy purchase_orders_access on public.purchase_orders
for all to authenticated
using (public.has_role(array['admin','pharmacy']::text[]))
with check (public.has_role(array['admin','pharmacy']::text[]));

create policy dispense_records_access on public.dispense_records
for all to authenticated
using (public.has_role(array['admin','pharmacy','billing']::text[]))
with check (public.has_role(array['admin','pharmacy','billing']::text[]));

-- NURSE
create policy medication_schedule_select_access on public.medication_schedule
for select to authenticated
using (public.has_role(array['admin','nurse','doctor']::text[]));

create policy medication_schedule_write_nurse on public.medication_schedule
for all to authenticated
using (public.has_role(array['admin','nurse']::text[]))
with check (public.has_role(array['admin','nurse']::text[]));

create policy nursing_notes_access on public.nursing_notes
for all to authenticated
using (public.has_role(array['admin','nurse']::text[]))
with check (public.has_role(array['admin','nurse']::text[]));

create policy nurse_alerts_access on public.nurse_alerts
for all to authenticated
using (public.has_role(array['admin','nurse']::text[]))
with check (public.has_role(array['admin','nurse']::text[]));

-- PATIENT MESSAGING
create policy conversations_select_participants on public.patient_conversations
for select to authenticated
using (
  "patientId"::text = auth.uid()::text
  or "doctorId"::text = auth.uid()::text
  or public.has_role(array['admin']::text[])
);

create policy conversations_insert_participants on public.patient_conversations
for insert to authenticated
with check (
  "patientId"::text = auth.uid()::text
  or "doctorId"::text = auth.uid()::text
  or public.has_role(array['admin']::text[])
);

create policy conversations_update_participants on public.patient_conversations
for update to authenticated
using (
  "patientId"::text = auth.uid()::text
  or "doctorId"::text = auth.uid()::text
  or public.has_role(array['admin']::text[])
)
with check (
  "patientId"::text = auth.uid()::text
  or "doctorId"::text = auth.uid()::text
  or public.has_role(array['admin']::text[])
);

create policy messages_select_participants on public.patient_messages
for select to authenticated
using (
  public.has_role(array['admin']::text[])
  or exists (
    select 1
    from public.patient_conversations c
    where c.id::text = "conversationId"::text
      and (c."patientId"::text = auth.uid()::text or c."doctorId"::text = auth.uid()::text)
  )
);

create policy messages_insert_sender on public.patient_messages
for insert to authenticated
with check (
  "senderId"::text = auth.uid()::text
  and (
    public.has_role(array['admin']::text[])
    or exists (
      select 1
      from public.patient_conversations c
      where c.id::text = "conversationId"::text
        and (c."patientId"::text = auth.uid()::text or c."doctorId"::text = auth.uid()::text)
    )
  )
);

-- ATTENDANCE
create policy staff_attendance_select_access on public.staff_attendance
for select to authenticated
using (public.has_role(array['admin','receptionist','nurse']::text[]));

create policy staff_attendance_write_access on public.staff_attendance
for all to authenticated
using (public.has_role(array['admin','receptionist']::text[]))
with check (public.has_role(array['admin','receptionist']::text[]));

-- BLOOD BANK
create policy blood_inventory_select_access on public.blood_inventory
for select to authenticated
using (public.has_role(array['admin','bloodbank','doctor','nurse','receptionist']::text[]));

create policy blood_inventory_write_access on public.blood_inventory
for all to authenticated
using (public.has_role(array['admin','bloodbank']::text[]))
with check (public.has_role(array['admin','bloodbank']::text[]));

create policy blood_donors_select_access on public.blood_donors
for select to authenticated
using (public.has_role(array['admin','bloodbank','doctor','nurse','receptionist']::text[]));

create policy blood_donors_write_access on public.blood_donors
for all to authenticated
using (public.has_role(array['admin','bloodbank']::text[]))
with check (public.has_role(array['admin','bloodbank']::text[]));

create policy blood_collections_access on public.blood_collections
for all to authenticated
using (public.has_role(array['admin','bloodbank']::text[]))
with check (public.has_role(array['admin','bloodbank']::text[]));

create policy blood_tests_access on public.blood_tests
for all to authenticated
using (public.has_role(array['admin','bloodbank']::text[]))
with check (public.has_role(array['admin','bloodbank']::text[]));

create policy blood_storage_access on public.blood_storage
for all to authenticated
using (public.has_role(array['admin','bloodbank']::text[]))
with check (public.has_role(array['admin','bloodbank']::text[]));

create policy blood_issues_access on public.blood_issues
for all to authenticated
using (public.has_role(array['admin','bloodbank']::text[]))
with check (public.has_role(array['admin','bloodbank']::text[]));

create policy blood_requests_access on public.blood_requests
for all to authenticated
using (public.has_role(array['admin','bloodbank','doctor','receptionist']::text[]))
with check (public.has_role(array['admin','bloodbank','doctor','receptionist']::text[]));

create policy blood_activity_logs_access on public.blood_activity_logs
for all to authenticated
using (public.has_role(array['admin','bloodbank']::text[]))
with check (public.has_role(array['admin','bloodbank']::text[]));
