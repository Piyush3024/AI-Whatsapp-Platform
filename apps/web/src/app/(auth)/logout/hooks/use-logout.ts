import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { logout } from "@/services/auth.service";

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      router.push("/login");
    },
    onError: () => {
      // Even if API fails — clear local state
      clearAuth();
      router.push("/login");
    },
  });
}
