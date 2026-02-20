import { useState, useCallback, useEffect, useRef } from 'react';
import { loadCollection, saveCollection } from '@/lib/backendSync';

export function useLocalStorage<T>(key: string, initialValue: T[]) {
  const hydratedRef = useRef(false);
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
    void (async () => {
      const localRaw = localStorage.getItem(key);
      const localData = localRaw ? (JSON.parse(localRaw) as T[]) : initialValue;
      const remote = await loadCollection<T>(key);
      const shouldUseRemote =
        !!remote && !(Array.isArray(remote) && remote.length === 0 && localData.length > 0);

      if (mounted && shouldUseRemote && remote) {
        setData(remote);
      }
      hydratedRef.current = true;

      // If backend has an empty collection but local has initial demo data, push local data upstream.
      if (!shouldUseRemote && localStorage.getItem('accessToken')) {
        void saveCollection(key, localData);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data));
    if (hydratedRef.current && localStorage.getItem('accessToken')) {
      void saveCollection(key, data);
    }
  }, [key, data]);

  const addItem = useCallback((item: T) => {
    setData(prev => [...prev, item]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    setData(prev => prev.map(item => 
      (item as any).id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setData(prev => prev.filter(item => (item as any).id !== id));
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
