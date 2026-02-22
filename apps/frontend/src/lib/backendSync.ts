import {
  bootstrapCollections,
  fetchCollection,
  replaceCollection,
  replaceCollectionValue
} from "@/services/collections.service";
import {
  bootstrapSupabaseCollectionsToLocalStorage,
  fetchCollectionFromSupabase,
  keyToTableMap,
  syncCollectionDiffToSupabase
} from "@/lib/supabaseSync";

function parseStoredArray<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function persistLocal(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function bootstrapCollectionsToLocalStorage() {
  try {
    const collections = await bootstrapCollections();
    for (const [key, value] of Object.entries(collections)) {
      persistLocal(key, value);
    }
    persistLocal("initialized", "true");
  } catch {
    // Backend unavailable: fall back to direct Supabase hydration.
    const loaded = await bootstrapSupabaseCollectionsToLocalStorage(Object.keys(keyToTableMap));
    if (loaded) {
      persistLocal("initialized", "true");
    }
  }
}

export async function loadCollection<T>(key: string): Promise<T[] | null> {
  try {
    return await fetchCollection<T>(key);
  } catch {
    const remote = await fetchCollectionFromSupabase<T>(key);
    if (remote) {
      persistLocal(key, remote);
      return remote;
    }
    return parseStoredArray<T>(key);
  }
}

export async function saveCollection<T>(key: string, items: T[]) {
  try {
    await replaceCollection<T>(key, items);
  } catch {
    const previous = parseStoredArray<T>(key);
    persistLocal(key, items);
    await syncCollectionDiffToSupabase(key, previous, items);
  }
}

export async function saveAnyCollection(key: string, items: unknown) {
  persistLocal(key, items);

  try {
    await replaceCollectionValue(key, items);
  } catch {
    if (Array.isArray(items)) {
      const previous = parseStoredArray<unknown>(key);
      await syncCollectionDiffToSupabase(key, previous, items);
    }
  }
}
