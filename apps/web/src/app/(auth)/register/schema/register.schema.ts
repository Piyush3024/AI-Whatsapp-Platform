import * as z from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),

    businessName: z
      .string()
      .trim()
      .min(1, "Business name is required")
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name must be at most 100 characters"),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required")
      .email("Valid email required")
      .max(255, "Email must be at most 255 characters"),

    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),

    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
