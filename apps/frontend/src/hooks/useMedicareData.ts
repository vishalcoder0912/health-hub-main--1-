/**
 * Central data hooks for Medicare HMS – all CRUD via Supabase.
 * Use these across the app for a single source of truth.
 */

import { useCallback, useEffect, useState } from 'react';
import * as crud from '@/services/supabaseCrud.service';
import { supabase } from '@/utils/supabase';
import type {
  AppointmentWithDetails,
  InvoiceWithPatient,
} from '@/services/supabaseCrud.service';
import type { TableRowMap as TRM } from '@/lib/supabase/database.types';
import { getTableName } from '@/lib/supabase/tables';
import { useSupabaseCrud } from './useSupabaseCrud';

const defaultOrder = { column: 'created_at', ascending: false } as const;

/** Generic Supabase CRUD hook – use for any Medicare table */
export { useSupabaseCrud } from './useSupabaseCrud';

/** Departments */
export function useDepartments() {
  return useSupabaseCrud('departments', { orderBy: { column: 'name', ascending: true } });
}

/** Patients */
export function usePatients() {
  return useSupabaseCrud('patients', { orderBy: { column: 'full_name', ascending: true } });
}

/** Doctors */
export function useDoctors() {
  return useSupabaseCrud('doctors', { orderBy: { column: 'specialization', ascending: true } });
}

/** Appointments (with patient + doctor details for lists) */
export function useAppointmentsWithDetails() {
  const [data, setData] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    const result = await crud.getAppointmentsWithDetails({
      orderBy: { column: 'appointment_date', ascending: false },
    });
    if (result.error) setError(result.error);
    else setData(result.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const tableName = getTableName('appointments');
    const channel = supabase
      .channel('appointments-details')
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    data,
    isLoading,
    error,
    refetch,
    create: crud.create.bind(null, 'appointments'),
    update: (id: string, payload: Partial<TRM['appointments']>) => crud.update('appointments', id, payload),
    remove: (id: string) => crud.remove('appointments', id),
  };
}

/** Prescriptions */
export function usePrescriptions() {
  return useSupabaseCrud('prescriptions', { orderBy: defaultOrder });
}

/** Lab reports */
export function useLabReports() {
  return useSupabaseCrud('lab_reports', { orderBy: defaultOrder });
}

/** Inventory */
export function useInventory() {
  return useSupabaseCrud('inventory', { orderBy: { column: 'item_name', ascending: true } });
}

/** Invoices (with patient name) */
export function useInvoicesWithPatient() {
  const [data, setData] = useState<InvoiceWithPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    const result = await crud.getInvoicesWithPatient({
      orderBy: { column: 'created_at', ascending: false },
    });
    if (result.error) setError(result.error);
    else setData(result.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const tableName = getTableName('invoices');
    const channel = supabase
      .channel('invoices-patient')
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    data,
    isLoading,
    error,
    refetch,
    create: crud.create.bind(null, 'invoices'),
    update: (id: string, payload: Partial<TRM['invoices']>) => crud.update('invoices', id, payload),
    remove: (id: string) => crud.remove('invoices', id),
  };
}

/** Blood bank */
export function useBloodBank() {
  return useSupabaseCrud('blood_bank', { orderBy: defaultOrder });
}