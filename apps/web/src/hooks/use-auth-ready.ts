import { useAuthStore } from "@/stores/auth.store";

export function useIsAuthReady(): boolean {
  const { isInitialized, accessToken } = useAuthStore();
  return isInitialized && !!accessToken;
}
