import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    phone: z.string().min(7).max(20).optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(16)
  })
});
