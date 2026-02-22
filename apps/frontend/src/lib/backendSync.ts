import {
  bootstrapCollections,
  fetchCollection,
  replaceCollection,
  replaceCollectionValue
} from "@/services/collections.service";

export async function bootstrapCollectionsToLocalStorage() {
  try {
    const collections = await bootstrapCollections();
    for (const [key, value] of Object.entries(collections)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    localStorage.setItem("initialized", "true");
  } catch {
    // Keep frontend usable even if backend is temporarily unavailable.
  }
}

export async function loadCollection<T>(key: string): Promise<T[] | null> {
  try {
    return await fetchCollection<T>(key);
  } catch {
    return null;
  }
}

export async function saveCollection<T>(key: string, items: T[]) {
  try {
    await replaceCollection<T>(key, items);
  } catch {
    // Local state is source of truth for immediate UX; backend sync retries on next changes.
  }
}

export async function saveAnyCollection(key: string, items: unknown) {
  try {
    await replaceCollectionValue(key, items);
  } catch {
    // Ignore to keep UI responsive.
  }
}
