import { z } from "zod";

export const createBookingSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),

  serviceIds: z.array(z.string()).min(1, "At least one service is required"),

  startTime: z
    .string()
    .min(1, "Start time is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),

  staffId: z.string().optional(),

  locationId: z.string().optional(),

  notes: z.string().max(500, "Notes must be under 500 characters").optional(),

  source: z.enum(["WHATSAPP", "MANUAL", "ONLINE"]).optional(),
});

export type CreateBookingFormValues = z.infer<typeof createBookingSchema>;
