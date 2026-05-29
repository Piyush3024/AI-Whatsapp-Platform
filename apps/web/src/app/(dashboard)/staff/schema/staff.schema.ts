import { z } from "zod";
import { DayOfWeek } from "@/types/staff.types";

export const staffSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "E.164 format required (e.g. +9779801234567)")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email")
    .max(255)
    .optional()
    .or(z.literal("")),
  locationId: z.string().uuid("Invalid location").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type StaffFormValues = z.infer<typeof staffSchema>;

export const scheduleItemSchema = z
  .object({
    dayOfWeek: z.nativeEnum(DayOfWeek),
    isWorking: z.boolean(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:MM format required"),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:MM format required"),
  })
  .refine((val) => !val.isWorking || (val.startTime && val.endTime), {
    message: "Start/end time required when working",
    path: ["startTime"],
  });

export const staffScheduleSchema = z.object({
  schedule: z.array(scheduleItemSchema).length(7, "All 7 days required"),
});

export type StaffScheduleFormValues = z.infer<typeof staffScheduleSchema>;

export const scheduleOverrideSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format required"),
    isWorking: z.boolean(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:MM format required")
      .optional()
      .or(z.literal("")),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:MM format required")
      .optional()
      .or(z.literal("")),
    reason: z.string().max(255).optional().or(z.literal("")),
  })
  .refine((val) => !val.isWorking || (val.startTime && val.endTime), {
    message: "Start/end time required when working",
    path: ["startTime"],
  });

export type ScheduleOverrideFormValues = z.infer<typeof scheduleOverrideSchema>;
