import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  duration: z
    .number({ invalid_type_error: "Duration required" })
    .int()
    .min(5, "Minimum 5 minutes")
    .max(480, "Maximum 480 minutes"),
  priceRupees: z
    .number({ invalid_type_error: "Price required" })
    .min(0, "Price cannot be negative"),
  currency: z.string().max(3).default("NPR"),
  locationId: z.string().uuid("Invalid location").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
