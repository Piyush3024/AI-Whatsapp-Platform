import { z } from "zod";
import { DayOfWeek } from "@/types/staff.types";

export const tenantSettingsSchema = z.object({
  name: z.string().min(2, "Min 2 characters").max(100),
  timezone: z.string().optional().or(z.literal("")),
  currency: z.string().max(3).optional().or(z.literal("")),
  language: z.string().optional().or(z.literal("")),
});

export type TenantSettingsFormValues = z.infer<typeof tenantSettingsSchema>;

export const locationSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  address: z.string().max(255).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "E.164 format required")
    .optional()
    .or(z.literal("")),
  isDefault: z.boolean().default(false),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

export const businessHourItemSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  isOpen: z.boolean(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:MM required"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:MM required"),
});

export const businessHoursSchema = z.object({
  hours: z.array(businessHourItemSchema).length(7, "All 7 days required"),
});

export type BusinessHoursFormValues = z.infer<typeof businessHoursSchema>;
