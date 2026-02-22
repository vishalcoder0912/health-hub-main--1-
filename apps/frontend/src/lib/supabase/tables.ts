/**
 * Medicare HMS – Supabase table names (must match schema)
 */

import type { TableName } from './database.types';

export const MEDICARE_TABLES = {
  departments: 'departments',
  users: 'users',
  patients: 'patients',
  doctors: 'doctors',
  appointments: 'appointments',
  prescriptions: 'prescriptions',
  lab_reports: 'lab_reports',
  inventory: 'inventory',
  invoices: 'invoices',
  blood_bank: 'blood_bank',
} as const satisfies Record<TableName, string>;

export type MedicareTableName = keyof typeof MEDICARE_TABLES;

export function getTableName<K extends TableName>(key: K): string {
  return MEDICARE_TABLES[key];
}
