"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import type { User } from "@/types/api.types";

export function useAuthInit() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      try {
        const response = await apiClient.post<{
          data: {
            accessToken: string;
            expiresIn: number;
            user: User;
          };
        }>("/auth/refresh");

        if (!cancelled) {
          const { accessToken, user } = response.data.data;
          setAuth(user, accessToken);

          if (pathname === "/login" || pathname === "/register") {
            setTimeout(() => router.push("/dashboard"), 0);
          }
        }
      } catch {
        if (!cancelled) {
          clearAuth();
          if (pathname && pathname.startsWith("/dashboard")) {
            setTimeout(() => router.push("/login"), 0);
          }
        }
      } finally {
        if (!cancelled) {
          setInitialized();
        }
      }
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
