import { z } from "zod";

export const sendMessageSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
    text: z.string().trim().min(1, "Message text is required").max(5000),
  })
  .strict();

export const messageParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const messageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});