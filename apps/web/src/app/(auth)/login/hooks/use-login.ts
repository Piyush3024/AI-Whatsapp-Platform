import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { useAuthStore } from "@/stores/auth.store";
import { login } from "@/services/auth.service";
import { setCookie } from "@/lib/cookies";
import { handleApiError } from "@/lib/handle-error";
import type { AuthTokens } from "@/types/api.types";

export function useLogin() {
  const { setAuth, setPendingTwoFactor } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if ("requiresTwoFactor" in data && data.requiresTwoFactor) {
        setPendingTwoFactor(data.twoFactorToken);
        router.push("/login/2fa");
        return;
      }
      const tokens = data as AuthTokens;
      setCookie("refresh_token", tokens.refreshToken, 7);
      setAuth(tokens.user, tokens.accessToken, tokens.refreshToken);
      router.push("/dashboard");
    },
    onError: (error) => {
      handleApiError({ error, fallbackMessage: "Failed to login" });
    },
  });
}
