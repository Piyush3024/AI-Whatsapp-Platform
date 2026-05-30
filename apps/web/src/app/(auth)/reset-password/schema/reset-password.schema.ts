import * as z from "zod";

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .trim()
      .min(8, "Password kam se kam 8 characters ka hona chahiye."),
    confirmPassword: z.string().trim().min(1, "Password confirm karo."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords match nahi kar rahe.",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
