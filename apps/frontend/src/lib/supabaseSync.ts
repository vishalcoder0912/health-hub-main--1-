import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { getAll } from '@/services/base.service';

type IdRecord = Record<string, unknown> & { id?: string };

export const keyToTableMap: Record<string, string[]> = {
  users: ['users'],
  patients: ['patients'],
  appointments: ['appointments'],
  medicines: ['medicines'],
  labTests: ['labTests', 'lab_tests'],
  bills: ['bills'],
  beds: ['beds'],
  departments: ['departments'],
  vitals: ['vitals'],
  prescriptions: ['prescriptions'],
  medicalRecords: ['medicalRecords', 'medical_records'],
  doctorNotifications: ['doctorNotifications', 'doctor_notifications'],
  bloodDonors: ['bloodDonors', 'blood_donors'],
  bloodInventory: ['bloodInventory', 'blood_inventory'],
  bloodCollections: ['bloodCollections', 'blood_collections'],
  bloodIssues: ['bloodIssues', 'blood_issues'],
  bloodRequests: ['bloodRequests', 'blood_requests'],
  bloodStorage: ['bloodStorage', 'blood_storage'],
  bloodTests: ['bloodTests', 'blood_tests'],
  bloodActivityLogs: ['bloodActivityLogs', 'blood_activity_logs'],
  medicationSchedule: ['medicationSchedule', 'medication_schedule'],
  nursingNotes: ['nursingNotes', 'nursing_notes'],
  purchaseOrders: ['purchaseOrders', 'purchase_orders'],
  dispenseRecords: ['dispenseRecords', 'dispense_records'],
  patientConversations: ['patientConversations', 'patient_conversations'],
  patientMessages: ['patientMessages', 'patient_messages'],
  userProfiles: ['userProfiles', 'user_profiles'],
  staffAttendance: ['staffAttendance', 'staff_attendance'],
  nurseAlerts: ['nurseAlerts', 'nurse_alerts'],
};

const resolvedTableCache = new Map<string, string | null>();

function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[SupabaseSync:${context}] ${message}`);
}

function getSyntheticId(key: string, item: Record<string, unknown>): string | null {
  if (key === 'staffAttendance') {
    const staffId = typeof item.staffId === 'string' ? item.staffId : typeof item.oddbodyId === 'string' ? item.oddbodyId : null;
    const date = typeof item.date === 'string' ? item.date : null;
    if (staffId && date) return `${staffId}_${date}`;
  }
  return null;
}

function normalizeItemsWithId<T>(key: string, items: T[]): Array<T & { id: string }> | null {
  const normalized: Array<T & { id: string }> = [];

  for (const item of items) {
    const value = item as Record<string, unknown>;
    if (typeof value.id === 'string' && value.id) {
      normalized.push(item as T & { id: string });
      continue;
    }

    const syntheticId = getSyntheticId(key, value);
    if (!syntheticId) return null;

    normalized.push({ ...(item as object), id: syntheticId } as T & { id: string });
  }

  return normalized;
}

function dedupeById<T extends IdRecord>(items: T[]): T[] {
  const map = new Map<string, T>();
  const withoutId: T[] = [];

  for (const item of items) {
    if (!item.id) {
      withoutId.push(item);
      continue;
    }
    map.set(item.id, item);
  }

  return [...withoutId, ...Array.from(map.values())];
}

async function tableExists(tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('*', { head: true, count: 'exact' });
  return !error;
}

export async function resolveTableNameForKey(key: string): Promise<string | null> {
  if (resolvedTableCache.has(key)) {
    return resolvedTableCache.get(key) ?? null;
  }

  const candidates = keyToTableMap[key] ?? [key];
  for (const table of candidates) {
    if (await tableExists(table)) {
      resolvedTableCache.set(key, table);
      return table;
    }
  }

  resolvedTableCache.set(key, null);
  return null;
}

export async function fetchCollectionFromSupabase<T>(key: string): Promise<T[] | null> {
  try {
    const tableName = await resolveTableNameForKey(key);
    if (!tableName) return null;

    const response = await getAll<T & IdRecord>(tableName);
    if (response.error || !response.data) return null;

    return dedupeById(response.data) as T[];
  } catch (error) {
    logError(`fetch:${key}`, error);
    return null;
  }
}

export async function bootstrapSupabaseCollectionsToLocalStorage(keys: string[]): Promise<boolean> {
  let loadedAny = false;

  for (const key of keys) {
    const remote = await fetchCollectionFromSupabase<unknown>(key);
    if (!remote) continue;

    localStorage.setItem(key, JSON.stringify(remote));
    loadedAny = true;
  }

  return loadedAny;
}

export async function syncCollectionDiffToSupabase<T>(
  key: string,
  previousItems: T[],
  nextItems: T[]
): Promise<void> {
  try {
    const tableName = await resolveTableNameForKey(key);
    if (!tableName) return;

    const prev = normalizeItemsWithId(key, previousItems);
    const next = normalizeItemsWithId(key, nextItems);
    if (!prev || !next) return;

    const prevById = new Map(prev.map((item) => [item.id, item]));
    const nextById = new Map(next.map((item) => [item.id, item]));

    const deletedIds = Array.from(prevById.keys()).filter((id) => !nextById.has(id));
    const upserts: Array<Record<string, unknown>> = [];

    for (const [id, nextItem] of nextById.entries()) {
      const prevItem = prevById.get(id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(nextItem)) {
        upserts.push(nextItem as unknown as Record<string, unknown>);
      }
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from(tableName).upsert(upserts, { onConflict: 'id' });
      if (error) {
        logError(`upsert:${key}`, error);
      }
    }

    if (deletedIds.length > 0) {
      const { error } = await supabase.from(tableName).delete().in('id', deletedIds);
      if (error) {
        logError(`delete:${key}`, error);
      }
    }
  } catch (error) {
    logError(`sync:${key}`, error);
  }
}

export async function subscribeCollectionChanges(
  key: string,
  onChange: (event: 'INSERT' | 'UPDATE' | 'DELETE') => void
): Promise<(() => void) | null> {
  const tableName = await resolveTableNameForKey(key);
  if (!tableName) return null;

  const channel: RealtimeChannel = supabase
    .channel(`sync:${tableName}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName }, () => onChange('INSERT'))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tableName }, () => onChange('UPDATE'))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tableName }, () => onChange('DELETE'))
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(`[SupabaseSync:realtime:${tableName}] Channel error`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function subscribeMappedTables(
  keys: string[],
  onChange: (key: string) => void
): Promise<() => void> {
  const unsubscribers: Array<() => void> = [];

  await Promise.all(
    keys.map(async (key) => {
      const unsubscribe = await subscribeCollectionChanges(key, () => {
        onChange(key);
      });

      if (unsubscribe) {
        unsubscribers.push(unsubscribe);
      }
    })
  );

  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  };
}
