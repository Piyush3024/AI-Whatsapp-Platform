import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  businessName: z
    .string()
    .nonempty("Business name is required")
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must be at most 100 characters"),
  email: z
    .string()
    .nonempty("Email is required")
    .email("Valid email required")
    .max(255, "Email must be at most 255 characters"),
  password: z
    .string()
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
