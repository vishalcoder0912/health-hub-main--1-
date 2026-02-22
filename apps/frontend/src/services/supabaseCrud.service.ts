/**
 * Typed CRUD for Medicare HMS Supabase tables.
 * Uses base.service; all tables use id UUID and standard columns.
 */

import type { TableName, TableRowMap } from '@/lib/supabase/database.types';
import { getTableName } from '@/lib/supabase/tables';
import * as base from '@/services/base.service';

export type ServiceResult<T> = base.ServiceResult<T>;

export async function getAll<T extends TableName>(
  table: T,
  options?: base.QueryOptions
): Promise<ServiceResult<TableRowMap[T][]>> {
  return base.getAll<TableRowMap[T]>(getTableName(table), options);
}

export async function getById<T extends TableName>(
  table: T,
  id: string,
  columns = '*'
): Promise<ServiceResult<TableRowMap[T] | null>> {
  return base.getById<TableRowMap[T]>(getTableName(table), id, columns);
}

export async function create<T extends TableName>(
  table: T,
  payload: Partial<TableRowMap[T]> & Record<string, unknown>
): Promise<ServiceResult<TableRowMap[T]>> {
  return base.create<TableRowMap[T], Record<string, unknown>>(getTableName(table), payload);
}

export async function update<T extends TableName>(
  table: T,
  id: string,
  payload: Partial<Omit<TableRowMap[T], 'id' | 'created_at' | 'updated_at'>>
): Promise<ServiceResult<TableRowMap[T]>> {
  return base.update<TableRowMap[T], Record<string, unknown>>(getTableName(table), id, payload as Record<string, unknown>);
}

export async function remove(table: TableName, id: string): Promise<ServiceResult<boolean>> {
  return base.remove(getTableName(table), id);
}

/** Appointments with patient and doctor names (for lists) */
export type AppointmentWithDetails = TableRowMap['appointments'] & {
  patients: { full_name: string } | null;
  doctors: { specialization: string } | null;
};

export async function getAppointmentsWithDetails(
  options?: base.QueryOptions
): Promise<ServiceResult<AppointmentWithDetails[]>> {
  const table = getTableName('appointments');
  const columns = '*, patients(full_name), doctors(specialization)';
  return base.getAll<AppointmentWithDetails>(table, { ...options, columns: options?.columns ?? columns });
}

/** Invoices with patient name */
export type InvoiceWithPatient = TableRowMap['invoices'] & {
  patients: { full_name: string } | null;
};

export async function getInvoicesWithPatient(
  options?: base.QueryOptions
): Promise<ServiceResult<InvoiceWithPatient[]>> {
  const table = getTableName('invoices');
  const columns = '*, patients(full_name)';
  return base.getAll<InvoiceWithPatient>(table, { ...options, columns: options?.columns ?? columns });
}
