import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { useAuthStore } from "@/stores/auth.store";
import { logout } from "@/services/auth.service";

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      router.push("/login");
    },
    onError: () => {
      // Even if API fails — clear local state and cookie
      clearAuth();
      router.push("/login");
    },
  });
}
