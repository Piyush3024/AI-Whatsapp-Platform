import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email required"),
  password: z
    .string()
    .trim()
    .min(1, "Password required")
    .min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
