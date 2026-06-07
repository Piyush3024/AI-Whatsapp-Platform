"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { getCookie, setCookie, eraseCookie } from "@/lib/cookies";
import type { User } from "@/types/api.types";

const AUTH_ONLY_PATHS = new Set(["/login", "/register", "/login/2fa"]);

export function useAuthInit() {
  const { setAuth, clearAuth, setInitialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const refreshToken = getCookie("refresh_token");

      if (!refreshToken) {
        if (!cancelled) {
          clearAuth();
          setInitialized();
          if (pathname && pathname.startsWith("/dashboard")) {
            setTimeout(() => router.push("/login"), 0);
          }
        }
        return;
      }

      try {
        const response = await apiClient.post<{
          data: {
            accessToken: string;
            refreshToken: string;
            user: User;
          };
        }>("/auth/refresh", { refreshToken });

        if (!cancelled) {
          const {
            accessToken,
            refreshToken: newRefreshToken,
            user,
          } = response.data.data;
          setAuth(user, accessToken, newRefreshToken);
          setCookie("refresh_token", newRefreshToken, 7);

          if (pathname && AUTH_ONLY_PATHS.has(pathname)) {
            setTimeout(() => router.push("/dashboard"), 0);
          }
        }
      } catch {
        if (!cancelled) {
          clearAuth();
          eraseCookie("refresh_token");
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
