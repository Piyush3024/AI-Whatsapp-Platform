import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { useAuthStore } from "@/stores/auth.store";
import { verifyTwoFactorLogin } from "@/services/auth.service";
import { setCookie } from "@/lib/cookies";
import { handleApiError } from "@/lib/handle-error";

interface VerifyTwoFactorParams {
  twoFactorToken: string;
  token: string;
}

export function useVerifyTwoFactorLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearPendingTwoFactor = useAuthStore((s) => s.clearPendingTwoFactor);
  const router = useRouter();

  return useMutation({
    mutationFn: ({ twoFactorToken, token }: VerifyTwoFactorParams) =>
      verifyTwoFactorLogin(twoFactorToken, token),
    onSuccess: (data) => {
      setCookie("refresh_token", data.refreshToken, 7);
      setAuth(data.user, data.accessToken, data.refreshToken);
      clearPendingTwoFactor();
      router.push("/dashboard");
    },
    onError: (error) => {
      handleApiError({ error, fallbackMessage: "Invalid verification code" });
    },
  });
}
