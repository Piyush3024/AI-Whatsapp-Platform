import { Suspense } from "react";
import { VerifyEmailView } from "./_components/verify-email-view";

export const metadata = {
  title: "Verify Email — WhatsApp AI Platform",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailView />
    </Suspense>
  );
}
