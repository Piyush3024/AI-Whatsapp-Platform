import { z } from "zod";

export const twoFactorSchema = z.object({
  token: z
    .string()
    .min(6, "Code must be 6 digits")
    .max(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Code must be numeric"),
});

export type TwoFactorFormValues = z.infer<typeof twoFactorSchema>;
