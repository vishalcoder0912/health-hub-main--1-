import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

type JsonRecord = Record<string, unknown>;
type SupabaseRequestResult = {
  ok: boolean;
  data: unknown | null;
};

const supabaseUrl = env.SUPABASE_URL?.replace(/\/+$/, "");
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_API_KEY;
const canSync = Boolean(supabaseUrl && serviceRoleKey);

function buildUrl(path: string): string {
  return `${supabaseUrl}${path}`;
}

function getHeaders(prefer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: serviceRoleKey ?? "",
    Authorization: `Bearer ${serviceRoleKey ?? ""}`
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

async function request(path: string, init: RequestInit, context: string): Promise<SupabaseRequestResult> {
  if (!canSync) {
    return { ok: false, data: null };
  }

  try {
    const response = await fetch(buildUrl(path), init);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.warn(
        { context, status: response.status, body },
        "Supabase sync request failed"
      );
      return { ok: false, data: null };
    }

    if (response.status === 204) {
      return { ok: true, data: null };
    }

    return {
      ok: true,
      data: await response.json().catch(() => null)
    };
  } catch (error) {
    logger.warn(
      { context, error: error instanceof Error ? error.message : String(error) },
      "Supabase sync request error"
    );
    return { ok: false, data: null };
  }
}

export function isSupabaseSyncEnabled(): boolean {
  return canSync;
}

export async function upsertSupabaseRows(
  table: string,
  rows: JsonRecord[],
  onConflict = "id"
): Promise<boolean> {
  if (!canSync || rows.length === 0) {
    return false;
  }

  const query = `/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}&select=*`;
  const result = await request(
    query,
    {
      method: "POST",
      headers: getHeaders("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify(rows)
    },
    `upsert:${table}`
  );
  return result.ok;
}

export async function deleteSupabaseRowById(table: string, id: string): Promise<boolean> {
  if (!canSync) {
    return false;
  }

  const query = `/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`;
  const result = await request(
    query,
    {
      method: "DELETE",
      headers: getHeaders("return=minimal")
    },
    `delete:${table}:${id}`
  );
  return result.ok;
}

export async function upsertSupabaseCollectionValue(
  key: string,
  items: unknown
): Promise<boolean> {
  return upsertSupabaseRows(
    "data_collections",
    [
      {
        key,
        items
      }
    ],
    "key"
  );
}

type SupabaseCollectionRow = {
  key: string;
  items: unknown;
};

export async function getSupabaseCollectionValue(key: string): Promise<unknown | null> {
  if (!canSync) {
    return null;
  }

  const query = `/rest/v1/data_collections?key=eq.${encodeURIComponent(
    key
  )}&select=key,items&limit=1`;
  const result = await request(
    query,
    {
      method: "GET",
      headers: getHeaders()
    },
    `select:data_collections:${key}`
  );

  if (!result.ok || !Array.isArray(result.data) || result.data.length === 0) {
    return null;
  }

  const row = result.data[0] as SupabaseCollectionRow;
  return row.items ?? null;
}
