import { z } from "zod";

export const collectionKeyParamSchema = z.object({
  key: z.string().min(1).max(120)
});

export const collectionItemParamSchema = z.object({
  key: z.string().min(1).max(120),
  id: z.string().min(1).max(200)
});

export const setCollectionSchema = z.object({
  items: z.unknown()
});

export const collectionItemBodySchema = z.record(z.unknown());
