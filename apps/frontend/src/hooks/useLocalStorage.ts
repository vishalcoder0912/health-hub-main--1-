import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { fetchCollection, replaceCollection } from "@/services/collections.service";
import { supabase } from "@/utils/supabase";

type WithId = { id?: string };
type Updater<T> = T[] | ((prev: T[]) => T[]);

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function dedupeById<T extends WithId>(items: T[]): T[] {
  const byId = new Map<string, T>();
  const withoutId: T[] = [];

  for (const item of items) {
    if (!item?.id) {
      withoutId.push(item);
      continue;
    }
    byId.set(item.id, item);
  }

  return [...withoutId, ...Array.from(byId.values())];
}

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useLocalStorage<T extends WithId>(key: string, initialValue: T[]) {
  const initialValueRef = useRef(initialValue);
  const [data, setDataState] = useState<T[]>(() => {
    const local = safeParse<T[]>(localStorage.getItem(key), initialValueRef.current);
    return dedupeById(local);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dataRef = useRef<T[]>(data);
  const mutationVersionRef = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const applyLocalData = useCallback(
    (next: T[]) => {
      const deduped = dedupeById(next);
      dataRef.current = deduped;
      localStorage.setItem(key, JSON.stringify(deduped));
      setDataState(deduped);
    },
    [key]
  );

  const dataSignature = useMemo(() => JSON.stringify(data), [data]);
  const signatureRef = useRef(dataSignature);

  useEffect(() => {
    signatureRef.current = dataSignature;
  }, [dataSignature]);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [key]);

  const refreshFromBackend = useCallback(async () => {
    const remote = await fetchCollection<T>(key);
    const deduped = dedupeById(remote);
    const nextSignature = JSON.stringify(deduped);

    if (nextSignature === signatureRef.current) {
      return;
    }

    applyLocalData(deduped);
  }, [applyLocalData, key]);

  const commitCollection = useCallback(
    (next: T[], previous: T[]) => {
      const nextDeduped = dedupeById(next);
      const previousDeduped = dedupeById(previous);
      const version = ++mutationVersionRef.current;

      applyLocalData(nextDeduped);
      setError(null);

      void (async () => {
        try {
          const saved = await replaceCollection<T>(key, nextDeduped);
          if (version !== mutationVersionRef.current) return;
          applyLocalData(saved);
        } catch (commitError) {
          if (version !== mutationVersionRef.current) return;
          applyLocalData(previousDeduped);
          setError(toMessage(commitError, `Failed to save ${key}`));
        }
      })();
    },
    [applyLocalData, key]
  );

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const remote = await fetchCollection<T>(key);
        if (!mounted) return;
        applyLocalData(remote);
      } catch (loadError) {
        if (!mounted) return;
        setError(toMessage(loadError, `Failed to load ${key}`));
        const local = safeParse<T[]>(localStorage.getItem(key), initialValueRef.current);
        applyLocalData(local);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    const channel = supabase
      .channel(`collection-sync-${key}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "data_collections", filter: `key=eq.${key}` },
        () => {
          void refreshFromBackend();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "DataCollection", filter: `key=eq.${key}` },
        () => {
          void refreshFromBackend();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError((prev) => prev ?? `Realtime subscription failed for ${key}`);
        }
      });

    channelRef.current = channel;

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [applyLocalData, key, refreshFromBackend]);

  const setData = useCallback(
    (nextOrUpdater: Updater<T>) => {
      const previous = dataRef.current;
      const next =
        typeof nextOrUpdater === "function"
          ? (nextOrUpdater as (items: T[]) => T[])(previous)
          : nextOrUpdater;
      commitCollection(next, previous);
    },
    [commitCollection]
  );

  const addItem = useCallback(
    (item: T) => {
      const previous = dataRef.current;
      const next = dedupeById([...previous, item]);
      commitCollection(next, previous);
    },
    [commitCollection]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<T>) => {
      const previous = dataRef.current;
      const next = previous.map((item) => (item.id === id ? ({ ...item, ...updates } as T) : item));
      commitCollection(next, previous);
    },
    [commitCollection]
  );

  const deleteItem = useCallback(
    (id: string) => {
      const previous = dataRef.current;
      const next = previous.filter((item) => item.id !== id);
      commitCollection(next, previous);
    },
    [commitCollection]
  );

  const getById = useCallback((id: string) => dataRef.current.find((item) => item.id === id), []);

  return {
    data,
    setData,
    addItem,
    updateItem,
    deleteItem,
    getById,
    isLoading,
    error
  };
}
