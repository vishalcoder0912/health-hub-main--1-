import { supabase } from '@/utils/supabase';

const keyToTableMap: Record<string, string[]> = {
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

async function tableExists(tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  return !error;
}

export async function resolveTableNameForKey(key: string): Promise<string | null> {
  if (resolvedTableCache.has(key)) {
    return resolvedTableCache.get(key) ?? null;
  }

  const candidates = keyToTableMap[key] ?? [key];
  for (const tableName of candidates) {
    if (await tableExists(tableName)) {
      resolvedTableCache.set(key, tableName);
      return tableName;
    }
  }

  resolvedTableCache.set(key, null);
  return null;
}

export async function fetchCollectionFromSupabase<T>(key: string): Promise<T[] | null> {
  const tableName = await resolveTableNameForKey(key);
  if (!tableName) return null;

  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error(`[SupabaseSync:fetch:${key}]`, error.message);
    return null;
  }
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function insertRowToSupabase<T extends { id?: string }>(key: string, item: T): Promise<void> {
  const tableName = await resolveTableNameForKey(key);
  if (!tableName) return;

  const { error } = await supabase.from(tableName).insert([item]);
  if (error) {
    console.error(`[SupabaseSync:insert:${key}]`, error.message);
  }
}

export async function updateRowInSupabase<T>(key: string, id: string, updates: Partial<T>): Promise<void> {
  const tableName = await resolveTableNameForKey(key);
  if (!tableName) return;

  const { error } = await supabase.from(tableName).update(updates).eq('id', id);
  if (error) {
    console.error(`[SupabaseSync:update:${key}]`, error.message);
  }
}

export async function deleteRowFromSupabase(key: string, id: string): Promise<void> {
  const tableName = await resolveTableNameForKey(key);
  if (!tableName) return;

  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) {
    console.error(`[SupabaseSync:delete:${key}]`, error.message);
  }
}

export async function bootstrapSupabaseCollectionsToLocalStorage(keys: string[]): Promise<boolean> {
  let foundAny = false;

  for (const key of keys) {
    const data = await fetchCollectionFromSupabase<unknown>(key);
    if (!data) continue;
    localStorage.setItem(key, JSON.stringify(data));
    foundAny = true;
  }

  return foundAny;
}

export async function subscribeCollectionChanges(
  key: string,
  onChange: () => void
): Promise<(() => void) | null> {
  const tableName = await resolveTableNameForKey(key);
  if (!tableName) return null;

  const channel = supabase
    .channel(`sync:${tableName}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function hasStringId(item: unknown): item is { id: string } {
  return typeof (item as { id?: unknown })?.id === 'string';
}

export async function syncCollectionDiffToSupabase<T>(
  key: string,
  previousItems: T[],
  nextItems: T[]
): Promise<void> {
  const tableName = await resolveTableNameForKey(key);
  if (!tableName) return;

  const prevWithId = previousItems.filter(hasStringId);
  const nextWithId = nextItems.filter(hasStringId);

  if (nextItems.length > 0 && nextWithId.length !== nextItems.length) {
    return;
  }
  if (previousItems.length > 0 && prevWithId.length !== previousItems.length) {
    return;
  }

  const prevIds = new Set(prevWithId.map((item) => item.id));
  const nextIds = new Set(nextWithId.map((item) => item.id));
  const deletedIds = Array.from(prevIds).filter((id) => !nextIds.has(id));

  if (nextWithId.length > 0) {
    const { error: upsertError } = await supabase
      .from(tableName)
      .upsert(nextWithId as unknown as Record<string, unknown>[], { onConflict: 'id' });

    if (upsertError) {
      console.error(`[SupabaseSync:upsert:${key}]`, upsertError.message);
      return;
    }
  }

  if (deletedIds.length > 0) {
    const { error: deleteError } = await supabase.from(tableName).delete().in('id', deletedIds);
    if (deleteError) {
      console.error(`[SupabaseSync:delete-missing:${key}]`, deleteError.message);
    }
  }
}
