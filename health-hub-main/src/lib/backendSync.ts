import { apiRequest } from "@/lib/api";

export async function bootstrapCollectionsToLocalStorage() {
  try {
    const collections = await apiRequest<Record<string, unknown>>("/collections/bootstrap");
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
    const data = await apiRequest<unknown>(`/collections/${key}`);
    return Array.isArray(data) ? (data as T[]) : null;
  } catch {
    return null;
  }
}

export async function saveCollection<T>(key: string, items: T[]) {
  try {
    await apiRequest(`/collections/${key}`, {
      method: "PUT",
      body: JSON.stringify({ items })
    });
  } catch {
    // Local state is source of truth for immediate UX; backend sync retries on next changes.
  }
}

export async function saveAnyCollection(key: string, items: unknown) {
  try {
    await apiRequest(`/collections/${key}`, {
      method: "PUT",
      body: JSON.stringify({ items })
    });
  } catch {
    // Ignore to keep UI responsive.
  }
}
