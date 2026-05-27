import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { logout } from "@/services/auth.service";
import { eraseCookie } from "@/lib/cookies";

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      eraseCookie("refresh_token");
      clearAuth();
      router.push("/login");
    },
    onError: () => {
      // Even if API fails — clear local state and cookie
      eraseCookie("refresh_token");
      clearAuth();
      router.push("/login");
    },
  });
}
