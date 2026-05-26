"use client";

import { useEffect } from "react";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types/api.types";

/**
 * Page refresh pe accessToken memory se gone ho jaata hai.
 * Ye hook /auth/refresh call karke token restore karta hai.
 * Sirf ek baar run hota hai — app mount pe.
 */
export function useAuthInit() {
  const { setAuth, clearAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      try {
        const response = await apiClient.post<{
          data: { accessToken: string; user: User };
        }>("/auth/refresh");

        if (!cancelled) {
          const { accessToken, user } = response.data.data;
          setAuth(user, accessToken);
        }
      } catch {
        // Refresh failed = not logged in — silently clear
        if (!cancelled) {
          clearAuth();
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
