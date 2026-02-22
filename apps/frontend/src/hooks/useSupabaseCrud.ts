/**
 * Hook for easy CRUD on a Medicare HMS Supabase table.
 * Optionally subscribes to realtime so list updates automatically.
 */

import { useCallback, useEffect, useState } from 'react';
import type { TableName, TableRowMap } from '@/lib/supabase/database.types';
import { getTableName } from '@/lib/supabase/tables';
import * as crud from '@/services/supabaseCrud.service';
import { supabase } from '@/utils/supabase';
import type { QueryOptions } from '@/services/base.service';

export interface UseSupabaseCrudOptions {
  /** Select columns (default '*') */
  columns?: string;
  /** Order by */
  orderBy?: { column: string; ascending?: boolean };
  /** Limit */
  limit?: number;
  /** Subscribe to realtime INSERT/UPDATE/DELETE (default true) */
  enableRealtime?: boolean;
}

export interface UseSupabaseCrudResult<T extends TableName> {
  data: TableRowMap[T][];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (payload: Partial<TableRowMap[T]> & Record<string, unknown>) => Promise<{ data: TableRowMap[T] | null; error: string | null }>;
  update: (id: string, payload: Partial<TableRowMap[T]>) => Promise<{ data: TableRowMap[T] | null; error: string | null }>;
  remove: (id: string) => Promise<{ error: string | null }>;
}

export function useSupabaseCrud<T extends TableName>(
  table: T,
  options: UseSupabaseCrudOptions = {}
): UseSupabaseCrudResult<T> {
  const { columns, orderBy, limit, enableRealtime = true } = options;
  const [data, setData] = useState<TableRowMap[T][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tableName = getTableName(table);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const opts: QueryOptions = {};
    if (columns) opts.columns = columns;
    if (orderBy) opts.orderBy = orderBy;
    if (limit) opts.limit = limit;
    const result = await crud.getAll(table, opts);
    if (result.error) {
      setError(result.error);
      setData([]);
    } else {
      setData((result.data ?? []) as TableRowMap[T][]);
    }
    setIsLoading(false);
  }, [table, columns, orderBy, limit]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!enableRealtime || !tableName) return;
    const channel = supabase
      .channel(`crud-${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
        void refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, enableRealtime, refetch]);

  const createMutation = useCallback(
    async (payload: Partial<TableRowMap[T]> & Record<string, unknown>) => {
      const result = await crud.create(table, payload);
      if (result.error) return { data: null, error: result.error };
      await refetch();
      return { data: result.data as TableRowMap[T], error: null };
    },
    [table, refetch]
  );

  const updateMutation = useCallback(
    async (id: string, payload: Partial<TableRowMap[T]>) => {
      const result = await crud.update(table, id, payload);
      if (result.error) return { data: null, error: result.error };
      await refetch();
      return { data: result.data as TableRowMap[T], error: null };
    },
    [table, refetch]
  );

  const removeMutation = useCallback(
    async (id: string) => {
      const result = await crud.remove(table, id);
      if (result.error) return { error: result.error };
      await refetch();
      return { error: null };
    },
    [table, refetch]
  );

  return {
    data,
    isLoading,
    error,
    refetch,
    create: createMutation,
    update: updateMutation,
    remove: removeMutation,
  };
}
