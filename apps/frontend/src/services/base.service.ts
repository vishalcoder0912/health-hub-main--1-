import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

export type ServiceSuccess<T> = {
  data: T;
  error: null;
};

export type ServiceFailure = {
  data: null;
  error: string;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export interface QueryOptions {
  columns?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

function normalizeError(context: string, error: PostgrestError | Error | null): string {
  if (!error) {
    const message = `[${context}] Unknown Supabase error`;
    console.error(message);
    return message;
  }

  if ('code' in error || 'details' in error || 'hint' in error) {
    const postgrestError = error as PostgrestError;
    const message = `[${context}] ${postgrestError.message}`;
    console.error(message, {
      code: postgrestError.code,
      details: postgrestError.details,
      hint: postgrestError.hint,
    });
    return message;
  }

  const message = `[${context}] ${error.message}`;
  console.error(message);
  return message;
}

function ok<T>(data: T): ServiceSuccess<T> {
  return { data, error: null };
}

function fail(message: string): ServiceFailure {
  return { data: null, error: message };
}

export async function getAll<T>(table: string, options?: QueryOptions): Promise<ServiceResult<T[]>> {
  try {
    let query = supabase.from(table).select(options?.columns ?? '*');

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) return fail(normalizeError(`${table}.getAll`, error));

    return ok((data as T[]) ?? []);
  } catch (error) {
    return fail(normalizeError(`${table}.getAll`, error as Error));
  }
}

export async function getById<T>(table: string, id: string, columns = '*'): Promise<ServiceResult<T | null>> {
  try {
    const { data, error } = await supabase.from(table).select(columns).eq('id', id).maybeSingle();

    if (error) return fail(normalizeError(`${table}.getById`, error));
    return ok((data as T | null) ?? null);
  } catch (error) {
    return fail(normalizeError(`${table}.getById`, error as Error));
  }
}

export async function create<TRead, TWrite extends Record<string, unknown>>(
  table: string,
  payload: TWrite
): Promise<ServiceResult<TRead>> {
  try {
    const { data, error } = await supabase.from(table).insert([payload]).select('*').single();

    if (error) return fail(normalizeError(`${table}.create`, error));
    return ok(data as TRead);
  } catch (error) {
    return fail(normalizeError(`${table}.create`, error as Error));
  }
}

export async function update<TRead, TWrite extends Record<string, unknown>>(
  table: string,
  id: string,
  payload: Partial<TWrite>
): Promise<ServiceResult<TRead>> {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return fail(normalizeError(`${table}.update`, error));
    return ok(data as TRead);
  } catch (error) {
    return fail(normalizeError(`${table}.update`, error as Error));
  }
}

export async function remove(table: string, id: string): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return fail(normalizeError(`${table}.remove`, error));

    return ok(true);
  } catch (error) {
    return fail(normalizeError(`${table}.remove`, error as Error));
  }
}
