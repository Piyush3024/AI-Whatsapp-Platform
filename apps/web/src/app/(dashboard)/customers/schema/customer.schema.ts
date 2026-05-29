import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be under 100 characters"),

  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Enter a valid phone number (e.g. +9779801234567)",
    ),

  email: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),

  notes: z.string().max(500, "Notes must be under 500 characters").optional(),

  optInStatus: z
    .enum(["OPTED_IN", "OPTED_OUT", "PENDING"])
    .optional()
    .default("PENDING"),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be under 100 characters")
    .optional(),
});

export type CreateCustomerFormValues = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerFormValues = z.infer<typeof updateCustomerSchema>;
