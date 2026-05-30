"use client";

import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@/services/auth.service";
import { handleApiError } from "@/lib/handle-error";

export function useForgotPassword() {
  return useMutation({
    mutationFn: forgotPassword,
    onError: (error) => {
      handleApiError({
        error,
        fallbackMessage: "Something went wrong. Please try again.",
      });
    },
  });
}
