import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { defaultCollectionKeys, defaultCollections } from "./collections.defaults.js";

export async function bootstrapCollections() {
  for (const key of defaultCollectionKeys) {
    await prisma.dataCollection.upsert({
      where: { key },
      update: {},
      create: { key, items: defaultCollections[key] as Prisma.InputJsonValue }
    });
  }

  const rows = await prisma.dataCollection.findMany({ where: { key: { in: defaultCollectionKeys } } });
  const mapped: Record<string, unknown> = {};
  for (const row of rows) {
    mapped[row.key] = row.items;
  }
  return mapped;
}

export async function getCollection(key: string) {
  const existing = await prisma.dataCollection.findUnique({ where: { key } });
  if (!existing) {
    const created = await prisma.dataCollection.create({
      data: { key, items: [] }
    });
    return created.items;
  }
  return existing.items;
}

export async function setCollection(key: string, items: unknown) {
  const updated = await prisma.dataCollection.upsert({
    where: { key },
    update: { items: items as Prisma.InputJsonValue },
    create: { key, items: items as Prisma.InputJsonValue }
  });

  return updated.items;
}
