import { useAuthStore } from "@/stores/auth.store";

export function useIsAuthReady(): boolean {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const accessToken = useAuthStore((s) => s.accessToken);
  return isInitialized && !!accessToken;
}
