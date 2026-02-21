import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

function formatSupabaseError(context: string, error: PostgrestError | null): string {
  if (!error) return 'Unknown database error';
  const message = `[${context}] ${error.message}`;
  console.error(message, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
  return message;
}

export async function getAll<T>(table: string): Promise<ServiceResult<T[]>> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) return { data: null, error: formatSupabaseError(`${table}.getAll`, error) };
  return { data: (data as T[]) || [], error: null };
}

export async function getById<T>(table: string, id: string): Promise<ServiceResult<T | null>> {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) return { data: null, error: formatSupabaseError(`${table}.getById`, error) };
  return { data: (data as T | null) ?? null, error: null };
}

export async function create<T extends Record<string, unknown>>(
  table: string,
  payload: T
): Promise<ServiceResult<T>> {
  const { data, error } = await supabase.from(table).insert([payload]).select('*').single();
  if (error) return { data: null, error: formatSupabaseError(`${table}.create`, error) };
  return { data: data as T, error: null };
}

export async function update<T extends Record<string, unknown>>(
  table: string,
  id: string,
  payload: Partial<T>
): Promise<ServiceResult<T>> {
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { data: null, error: formatSupabaseError(`${table}.update`, error) };
  return { data: data as T, error: null };
}

export async function remove(table: string, id: string): Promise<ServiceResult<boolean>> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return { data: null, error: formatSupabaseError(`${table}.remove`, error) };
  return { data: true, error: null };
}
