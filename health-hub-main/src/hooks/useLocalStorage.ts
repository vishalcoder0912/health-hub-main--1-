import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchCollectionFromSupabase,
  subscribeCollectionChanges,
  syncCollectionDiffToSupabase,
} from '@/lib/supabaseSync';

type WithId = { id?: string };

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function dedupeById<T extends WithId>(items: T[]): T[] {
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

export function useLocalStorage<T extends WithId>(key: string, initialValue: T[]) {
  const isHydratedRef = useRef(false);
  const isApplyingRemoteRef = useRef(false);
  const previousDataRef = useRef<T[]>(initialValue);
  const writeTimerRef = useRef<number | null>(null);

  const [data, setData] = useState<T[]>(() => {
    const parsed = safeParse<T[]>(localStorage.getItem(key), initialValue);
    return dedupeById(parsed);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRemoteData = useCallback((next: T[]) => {
    isApplyingRemoteRef.current = true;
    const deduped = dedupeById(next);
    previousDataRef.current = deduped;
    setData(deduped);
    window.setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 0);
  }, []);

  const refreshFromSupabase = useCallback(async () => {
    const remote = await fetchCollectionFromSupabase<T>(key);
    if (!remote) return;
    applyRemoteData(remote);
  }, [applyRemoteData, key]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const remote = await fetchCollectionFromSupabase<T>(key);
        if (!mounted) return;

        if (remote) {
          applyRemoteData(remote);
        } else {
          const local = safeParse<T[]>(localStorage.getItem(key), initialValue);
          applyRemoteData(local);
        }

        unsubscribe = await subscribeCollectionChanges(key, () => {
          void refreshFromSupabase();
        });
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : `Failed to load ${key}`;
        setError(message);
        console.error(`[useLocalStorage:${key}:init]`, message);
      } finally {
        if (mounted) {
          isHydratedRef.current = true;
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current);
      }
    };
  }, [applyRemoteData, initialValue, key, refreshFromSupabase]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data));

    if (!isHydratedRef.current || isApplyingRemoteRef.current) {
      previousDataRef.current = data;
      return;
    }

    if (writeTimerRef.current) {
      window.clearTimeout(writeTimerRef.current);
    }

    const previous = previousDataRef.current;
    previousDataRef.current = data;

    writeTimerRef.current = window.setTimeout(() => {
      void syncCollectionDiffToSupabase<T>(key, previous, data).catch((syncError) => {
        const message = syncError instanceof Error ? syncError.message : `Failed to sync ${key}`;
        setError(message);
        console.error(`[useLocalStorage:${key}:sync]`, message);
      });
    }, 300);
  }, [data, key]);

  const addItem = useCallback((item: T) => {
    setData((prev) => dedupeById([...prev, item]));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    setData((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setData((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getById = useCallback(
    (id: string) => data.find((item) => item.id === id),
    [data]
  );

  return {
    data,
    setData,
    addItem,
    updateItem,
    deleteItem,
    getById,
    isLoading,
    error,
  };
}
