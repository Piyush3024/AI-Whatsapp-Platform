import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { login } from "@/services/auth.service";
import { setCookie } from "@/lib/cookies";

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setCookie("refresh_token", data.refreshToken, 7);
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push("/dashboard");
    },
  });
}
