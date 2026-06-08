import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { useAuthStore } from "@/stores/auth.store";
import { register } from "@/services/auth.service";
import { setCookie } from "@/lib/cookies";
import { handleApiError } from "@/lib/handle-error";
import type { RegisterFormValues } from "../schema/register.schema";

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: (values: RegisterFormValues) => {
      const { confirmPassword, ...registerData } = values;
      return register(registerData);
    },
    onSuccess: (data) => {
      setCookie("refresh_token", data.refreshToken, 7);
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push("/dashboard");
    },
    onError: (error) => {
      handleApiError({ error, fallbackMessage: "Registration failed" });
    },
  });
}
