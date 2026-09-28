import { z } from "zod";

export const createStorySchema = z
  .object({
    image: z.string().trim().min(1, "Story image is required").max(5_000_000),
  })
  .strict();

export const storyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});