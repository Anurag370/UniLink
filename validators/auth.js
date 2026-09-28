import { z } from "zod";

const passwordRule = z
  .string()
  .refine((value) => new TextEncoder().encode(value).byteLength <= 72, {
    message: "Password must be 72 bytes or fewer",
  });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.email("A valid email is required"),
    password: passwordRule.refine(
      (value) => value.length >= 8,
      "Password must be at least 8 characters"
    ),
    username: z.string().trim().max(50).nullish(),
    profilePhoto: z.string().max(5_000_000).nullish(),
    department: z.string().trim().max(100).nullish(),
    accountType: z.enum(["student", "alumni"]).default("student"),
    year: z.string().trim().max(50).nullish(),
    graduationYear: z.coerce.number().int().min(1900).max(2100).nullish(),
    currentRole: z.string().trim().max(100).nullish(),
    company: z.string().trim().max(100).nullish(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email("A valid email is required"),
    password: passwordRule.refine(
      (value) => value.length >= 1,
      "Password is required"
    ),
  })
  .strict();