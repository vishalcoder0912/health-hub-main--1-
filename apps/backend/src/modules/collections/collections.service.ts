import { randomUUID } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { ApiError } from "../../common/utils/api-error.js";
import {
  getSupabaseCollectionValue,
  isSupabaseSyncEnabled,
  upsertSupabaseCollectionValue
} from "../../integrations/supabase-sync.js";
import { defaultCollectionKeys, defaultCollections } from "./collections.defaults.js";

type CollectionItem = Record<string, unknown> & { id: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCollectionArray(items: unknown): CollectionItem[] {
  if (!Array.isArray(items)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Collection does not support item-level operations",
      "COLLECTION_NOT_ARRAY"
    );
  }

  const byId = new Map<string, CollectionItem>();
  for (const item of items) {
    if (!isObject(item)) continue;
    const id = typeof item.id === "string" && item.id.trim().length > 0 ? item.id : null;
    if (!id) continue;
    byId.set(id, { ...item, id });
  }

  return Array.from(byId.values());
}

function normalizeCollectionValue(items: unknown): unknown {
  if (!Array.isArray(items)) {
    return items;
  }
  return normalizeCollectionArray(items);
}

function ensureCollectionItem(input: unknown): CollectionItem {
  if (!isObject(input)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Collection item must be an object", "INVALID_ITEM_BODY");
  }

  const maybeId = typeof input.id === "string" && input.id.trim().length > 0 ? input.id.trim() : randomUUID();
  return {
    ...input,
    id: maybeId
  };
}

async function getOrCreateCollectionRow(key: string) {
  const existing = await prisma.dataCollection.findUnique({ where: { key } });
  if (existing) {
    return existing;
  }

  return prisma.dataCollection.create({
    data: { key, items: [] }
  });
}

export async function bootstrapCollections() {
  if (isSupabaseSyncEnabled()) {
    let syncedAny = false;
    const mapped: Record<string, unknown> = {};

    for (const key of defaultCollectionKeys) {
      const synced = await upsertSupabaseCollectionValue(key, defaultCollections[key]);
      syncedAny = syncedAny || synced;
      const remoteValue = await getSupabaseCollectionValue(key);
      mapped[key] = remoteValue ?? defaultCollections[key];
    }

    if (syncedAny) {
      return mapped;
    }
  }

  for (const key of defaultCollectionKeys) {
    await prisma.dataCollection.upsert({
      where: { key },
      update: {},
      create: { key, items: defaultCollections[key] as Prisma.InputJsonValue }
    });
    await upsertSupabaseCollectionValue(key, defaultCollections[key]);
  }

  const rows = await prisma.dataCollection.findMany({ where: { key: { in: defaultCollectionKeys } } });
  const mapped: Record<string, unknown> = {};
  for (const row of rows) {
    mapped[row.key] = row.items;
  }
  return mapped;
}

export async function getCollection(key: string) {
  if (isSupabaseSyncEnabled()) {
    const remoteValue = await getSupabaseCollectionValue(key);
    if (remoteValue !== null) {
      return normalizeCollectionValue(remoteValue);
    }

    const created = await upsertSupabaseCollectionValue(key, []);
    if (created) {
      return [];
    }
  }

  const existing = await getOrCreateCollectionRow(key);
  return normalizeCollectionValue(existing.items);
}

export async function setCollection(key: string, items: unknown) {
  const normalized = normalizeCollectionValue(items);

  if (isSupabaseSyncEnabled()) {
    const saved = await upsertSupabaseCollectionValue(key, normalized);
    if (saved) {
      return normalized;
    }
  }

  const updated = await prisma.dataCollection.upsert({
    where: { key },
    update: { items: normalized as Prisma.InputJsonValue },
    create: { key, items: normalized as Prisma.InputJsonValue }
  });

  await upsertSupabaseCollectionValue(key, normalized);
  return normalizeCollectionValue(updated.items);
}

export async function getCollectionItem(key: string, itemId: string) {
  const collection = await getCollection(key);
  const items = normalizeCollectionArray(collection);
  return items.find((item) => item.id === itemId) ?? null;
}

export async function createCollectionItem(key: string, item: unknown) {
  const nextItem = ensureCollectionItem(item);
  const collection = await getCollection(key);
  const items = normalizeCollectionArray(collection);

  if (items.some((existing) => existing.id === nextItem.id)) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Collection item with id '${nextItem.id}' already exists`,
      "COLLECTION_ITEM_EXISTS"
    );
  }

  items.push(nextItem);
  await setCollection(key, items);
  return nextItem;
}

export async function updateCollectionItem(key: string, itemId: string, input: unknown) {
  if (!isObject(input)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Collection item must be an object", "INVALID_ITEM_BODY");
  }

  const collection = await getCollection(key);
  const items = normalizeCollectionArray(collection);
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Collection item not found", "COLLECTION_ITEM_NOT_FOUND");
  }

  const updated = {
    ...items[index],
    ...input,
    id: itemId
  };
  items[index] = updated;
  await setCollection(key, items);
  return updated;
}

export async function deleteCollectionItem(key: string, itemId: string) {
  const collection = await getCollection(key);
  const items = normalizeCollectionArray(collection);
  const nextItems = items.filter((item) => item.id !== itemId);
  if (nextItems.length === items.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Collection item not found", "COLLECTION_ITEM_NOT_FOUND");
  }

  await setCollection(key, nextItems);
  return true;
}
