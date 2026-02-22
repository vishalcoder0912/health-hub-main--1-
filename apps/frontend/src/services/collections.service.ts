import { apiRequest } from "@/lib/api";

type CollectionItem = Record<string, unknown> & { id?: string };

function collectionPath(key: string): string {
  return `/collections/${encodeURIComponent(key)}`;
}

function collectionItemPath(key: string, id: string): string {
  return `/collections/${encodeURIComponent(key)}/${encodeURIComponent(id)}`;
}

export async function bootstrapCollections(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>("/collections/bootstrap");
}

export async function fetchCollection<T>(key: string): Promise<T[]> {
  const data = await apiRequest<unknown>(collectionPath(key));
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function replaceCollection<T>(key: string, items: T[]): Promise<T[]> {
  return apiRequest<T[]>(collectionPath(key), {
    method: "PUT",
    body: JSON.stringify({ items })
  });
}

export async function replaceCollectionValue<T>(key: string, value: T): Promise<T> {
  return apiRequest<T>(collectionPath(key), {
    method: "PUT",
    body: JSON.stringify({ items: value })
  });
}

export async function fetchCollectionItem<T>(key: string, id: string): Promise<T> {
  return apiRequest<T>(collectionItemPath(key, id));
}

export async function createCollectionItem<T extends CollectionItem>(
  key: string,
  item: T
): Promise<T> {
  return apiRequest<T>(collectionPath(key), {
    method: "POST",
    body: JSON.stringify(item)
  });
}

export async function updateCollectionItem<T extends CollectionItem>(
  key: string,
  id: string,
  item: Partial<T>
): Promise<T> {
  return apiRequest<T>(collectionItemPath(key, id), {
    method: "PUT",
    body: JSON.stringify(item)
  });
}

export async function deleteCollectionItem(key: string, id: string): Promise<void> {
  await apiRequest<null>(collectionItemPath(key, id), {
    method: "DELETE"
  });
}
