import * as z from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Valid email address daalo."),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
