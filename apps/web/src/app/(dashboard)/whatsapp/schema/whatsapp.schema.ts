import { z } from "zod";

export const createWhatsAppSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "Phone number required")
    .regex(/^\+[1-9]\d{6,14}$/, "E.164 format required (e.g. +9779801234567)"),
  displayName: z.string().min(1, "Display name required").max(100),
  phoneNumberId: z.string().max(50).optional().or(z.literal("")),
  greetingMessage: z.string().max(500).optional().or(z.literal("")),
  autoReplyEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export type CreateWhatsAppFormValues = z.infer<typeof createWhatsAppSchema>;

export const updateWhatsAppSchema = z.object({
  displayName: z.string().min(1, "Display name required").max(100),
  greetingMessage: z.string().max(500).optional().or(z.literal("")),
  autoReplyEnabled: z.boolean(),
  isActive: z.boolean(),
});

export type UpdateWhatsAppFormValues = z.infer<typeof updateWhatsAppSchema>;

export const testMessageSchema = z.object({
  recipientPhone: z
    .string()
    .min(1, "Recipient phone required")
    .regex(/^\+[1-9]\d{6,14}$/, "E.164 format required (e.g. +9779801234567)"),
  message: z
    .string()
    .min(1, "Message required")
    .max(4096, "Exceeds WhatsApp limit"),
});

export type TestMessageFormValues = z.infer<typeof testMessageSchema>;
