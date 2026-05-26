import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import type { AuthTokens } from "@/types/api.types";

// --- API calls ---

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  name: string;
  tenantName: string;
}

const login = async (dto: LoginDto): Promise<AuthTokens> => {
  const res = await apiClient.post<{ data: AuthTokens }>("/auth/login", dto);
  return res.data.data;
};

const register = async (dto: RegisterDto): Promise<AuthTokens> => {
  const res = await apiClient.post<{ data: AuthTokens }>("/auth/register", dto);
  return res.data.data;
};

const logout = async (): Promise<void> => {
  await apiClient.post("/auth/logout");
};

// --- Hooks ---

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      router.push("/dashboard");
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      router.push("/dashboard");
    },
  });
}

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
