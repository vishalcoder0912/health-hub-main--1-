import { useState, useCallback, useEffect, useRef } from 'react';
import { loadCollection, saveCollection } from '@/lib/backendSync';
import {
  fetchCollectionFromSupabase,
  subscribeCollectionChanges,
  syncCollectionDiffToSupabase,
} from '@/lib/supabaseSync';

export function useLocalStorage<T>(key: string, initialValue: T[]) {
  const hydratedRef = useRef(false);
  const previousDataRef = useRef<T[]>(initialValue);
  const [data, setData] = useState<T[]>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    let mounted = true;
    let unsubscribeRealtime: (() => void) | null = null;

    void (async () => {
      const localRaw = localStorage.getItem(key);
      const localData = localRaw ? (JSON.parse(localRaw) as T[]) : initialValue;
      const supabaseData = await fetchCollectionFromSupabase<T>(key);
      const remote = supabaseData ?? (await loadCollection<T>(key));
      const shouldUseRemote = !!remote;

      if (mounted && shouldUseRemote && remote) {
        previousDataRef.current = remote;
        setData(remote);
      }
      hydratedRef.current = true;

      unsubscribeRealtime = await subscribeCollectionChanges(key, async () => {
        if (!mounted) return;
        const latest = await fetchCollectionFromSupabase<T>(key);
        if (latest) {
          setData(latest);
        }
      });

      // Fallback sync path for legacy backend collection API.
      if (!shouldUseRemote && localStorage.getItem('accessToken')) {
        void saveCollection(key, localData);
      }
    })();

    return () => {
      mounted = false;
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
    };
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data));
    if (hydratedRef.current && localStorage.getItem('accessToken')) {
      void saveCollection(key, data);
      const prev = previousDataRef.current;
      previousDataRef.current = data;
      void syncCollectionDiffToSupabase<T>(key, prev, data);
    } else {
      previousDataRef.current = data;
    }
  }, [key, data]);

  const addItem = useCallback((item: T) => {
    setData((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    setData((prev) => prev.map((item) => 
      (item as any).id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setData((prev) => prev.filter((item) => (item as any).id !== id));
  }, []);

  const getById = useCallback((id: string) => {
    return data.find(item => (item as any).id === id);
  }, [data]);

  return {
    data,
    setData,
    addItem,
    updateItem,
    deleteItem,
    getById,
  };
}
