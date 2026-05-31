"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import { useAuthStore } from "@/stores/auth.store";
import { resendVerification } from "@/services/auth.service";

export function UnverifiedBanner() {
  const user = useAuthStore((s) => s.user);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerifiedAt !== null) return null;

  const handleResend = async () => {
    if (isSending || sent) return;
    setIsSending(true);
    try {
      await resendVerification({ email: user.email });
      setSent(true);
      toast.success("Verification email sent. Please check your inbox.");
    } catch {
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <Icons.warning className="size-4 shrink-0" />
        <p className="text-sm font-medium">
          Please verify your email address to unlock all features.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
        onClick={handleResend}
        disabled={isSending || sent}
      >
        {isSending ? (
          <>
            <Icons.spinner className="mr-1.5 size-3.5 animate-spin" />
            Sending…
          </>
        ) : sent ? (
          <>
            <Icons.circleCheck className="mr-1.5 size-3.5" />
            Email Sent
          </>
        ) : (
          "Resend Email"
        )}
      </Button>
    </div>
  );
}
