import { apiRequest } from "@/lib/api";
import { create, getById, remove, update } from "@/services/base.service";
import {
  fetchCollectionFromSupabase,
  resolveTableNameForKey,
  syncCollectionDiffToSupabase
} from "@/lib/supabaseSync";

type CollectionItem = Record<string, unknown> & { id?: string };

function collectionPath(key: string): string {
  return `/collections/${encodeURIComponent(key)}`;
}

function collectionItemPath(key: string, id: string): string {
  return `/collections/${encodeURIComponent(key)}/${encodeURIComponent(id)}`;
}

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

function persistLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readSupabaseCollection<T>(key: string): Promise<T[]> {
  const remote = await fetchCollectionFromSupabase<T>(key);
  const rows = remote ?? [];
  persistLocal(key, rows);
  return rows;
}

export async function bootstrapCollections(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>("/collections/bootstrap");
}

export async function fetchCollection<T>(key: string): Promise<T[]> {
  try {
    const data = await apiRequest<unknown>(collectionPath(key));
    const rows = Array.isArray(data) ? (data as T[]) : [];
    persistLocal(key, rows);
    return rows;
  } catch {
    const remote = await fetchCollectionFromSupabase<T>(key);
    if (remote) {
      persistLocal(key, remote);
      return remote;
    }
    return parseStoredArray<T>(key);
  }
}

export async function replaceCollection<T>(key: string, items: T[]): Promise<T[]> {
  try {
    const saved = await apiRequest<T[]>(collectionPath(key), {
      method: "PUT",
      body: JSON.stringify({ items })
    });
    persistLocal(key, saved);
    return saved;
  } catch {
    const previous = parseStoredArray<T>(key);
    persistLocal(key, items);
    await syncCollectionDiffToSupabase(key, previous, items);

    const remote = await fetchCollectionFromSupabase<T>(key);
    const result = remote ?? items;
    persistLocal(key, result);
    return result;
  }
}

export async function replaceCollectionValue<T>(key: string, value: T): Promise<T> {
  try {
    const saved = await apiRequest<T>(collectionPath(key), {
      method: "PUT",
      body: JSON.stringify({ items: value })
    });
    persistLocal(key, saved);
    return saved;
  } catch {
    if (Array.isArray(value)) {
      const rows = await replaceCollection(key, value as unknown[]);
      return rows as unknown as T;
    }
    persistLocal(key, value);
    return value;
  }
}

export async function fetchCollectionItem<T>(key: string, id: string): Promise<T> {
  try {
    return await apiRequest<T>(collectionItemPath(key, id));
  } catch {
    const tableName = await resolveTableNameForKey(key);
    if (tableName) {
      const result = await getById<T & { id: string }>(tableName, id);
      if (!result.error && result.data) {
        return result.data;
      }
    }

    const localRows = parseStoredArray<(T & { id?: string })>(key);
    const localItem = localRows.find((item) => item.id === id);
    if (localItem) return localItem as T;

    throw new Error(`Item not found in ${key}: ${id}`);
  }
}

export async function createCollectionItem<T extends CollectionItem>(
  key: string,
  item: T
): Promise<T> {
  try {
    const created = await apiRequest<T>(collectionPath(key), {
      method: "POST",
      body: JSON.stringify(item)
    });
    const remote = await fetchCollection<T>(key);
    persistLocal(key, remote);
    return created;
  } catch {
    const tableName = await resolveTableNameForKey(key);
    const payload = { ...item, id: item.id ?? generateId() } as T;

    if (tableName) {
      const created = await create<T, T>(tableName, payload);
      if (!created.error) {
        await readSupabaseCollection<T>(key);
        return created.data;
      }
    }

    const localRows = parseStoredArray<T>(key);
    const nextRows = [...localRows, payload];
    persistLocal(key, nextRows);
    return payload;
  }
}

export async function updateCollectionItem<T extends CollectionItem>(
  key: string,
  id: string,
  item: Partial<T>
): Promise<T> {
  try {
    const updated = await apiRequest<T>(collectionItemPath(key, id), {
      method: "PUT",
      body: JSON.stringify(item)
    });
    const remote = await fetchCollection<T>(key);
    persistLocal(key, remote);
    return updated;
  } catch {
    const tableName = await resolveTableNameForKey(key);
    if (tableName) {
      const updated = await update<T, T>(tableName, id, item);
      if (!updated.error) {
        await readSupabaseCollection<T>(key);
        return updated.data;
      }
    }

    const localRows = parseStoredArray<T & { id?: string }>(key);
    const nextRows = localRows.map((row) =>
      row.id === id ? ({ ...row, ...item } as T & { id?: string }) : row
    );
    persistLocal(key, nextRows);
    const match = nextRows.find((row) => row.id === id);
    if (!match) {
      throw new Error(`Item not found in ${key}: ${id}`);
    }
    return match as T;
  }
}

export async function deleteCollectionItem(key: string, id: string): Promise<void> {
  try {
    await apiRequest<null>(collectionItemPath(key, id), {
      method: "DELETE"
    });
    const remote = await fetchCollection<CollectionItem>(key);
    persistLocal(key, remote);
    return;
  } catch {
    const tableName = await resolveTableNameForKey(key);
    if (tableName) {
      const removed = await remove(tableName, id);
      if (!removed.error) {
        await readSupabaseCollection<CollectionItem>(key);
        return;
      }
    }

    const localRows = parseStoredArray<CollectionItem>(key);
    const nextRows = localRows.filter((row) => row.id !== id);
    persistLocal(key, nextRows);
  }
}
