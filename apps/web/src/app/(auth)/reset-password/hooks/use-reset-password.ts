"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { resetPassword } from "@/services/auth.service";
import { handleApiError } from "@/lib/handle-error";

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: (data) => {
      toast.success(data.message ?? "Password reset ho gaya! Ab login karo.");
      router.push("/login");
    },
    onError: (error) => {
      handleApiError({
        error,
        fallbackMessage: "Password reset failed. Please try again.",
      });
    },
  });
}
