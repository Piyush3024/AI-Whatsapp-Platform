import { Suspense } from "react";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata = {
  title: "Reset Password — WhatsApp AI Platform",
};

export default function ResetPasswordPage() {
  // Suspense required — useSearchParams() needs it in App Router
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
