"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { setup2fa, enable2fa, disable2fa } from "@/services/auth.service";
import type { TwoFactorSetupResponse } from "@/types/api.types";

export function useSetup2fa() {
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: setup2fa,
    onSuccess: (data) => {
      setSetupData(data);
    },
    onError: () => {
      toast.error("Failed to initiate 2FA setup. Please try again.");
    },
  });

  return { ...mutation, setupData };
}

export function useEnable2fa(onSuccess?: () => void) {
  return useMutation({
    mutationFn: enable2fa,
    onSuccess: () => {
      toast.success("2FA has been enabled successfully.");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Invalid code. Please check your authenticator app.");
    },
  });
}

export function useDisable2fa(onSuccess?: () => void) {
  return useMutation({
    mutationFn: disable2fa,
    onSuccess: () => {
      toast.success("2FA has been disabled.");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Invalid code. Please verify your identity.");
    },
  });
}
