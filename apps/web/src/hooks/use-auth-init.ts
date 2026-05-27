"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { getCookie, setCookie, eraseCookie } from "@/lib/cookies";
import type { User } from "@/types/api.types";

/**
 * Runs once on app mount. Tries to restore the session by calling /auth/refresh
 * with the refresh token stored in a client-side cookie.
 * - If successful: restores user + accessToken in store, rotates cookie.
 * - If failed: clears store + cookie, redirects to /login only if on a protected route.
 */
export function useAuthInit() {
  const { setAuth, clearAuth, setInitialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const refreshToken = getCookie("refresh_token");

      if (!refreshToken) {
        // No cookie at all — not logged in
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
          // Rotate the cookie with the fresh refresh token
          setCookie("refresh_token", newRefreshToken, 7);

          if (pathname === "/login" || pathname === "/register") {
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
