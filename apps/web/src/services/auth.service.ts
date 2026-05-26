import apiClient from "@/lib/api-client";
import type { AuthTokens } from "@/types/api.types";
import { RegisterDto } from "@/app/(auth)/register/types/register-types";
import { LoginDto } from "@/app/(auth)/login/types/login-types";
import { API_ENDPOINTS } from "@/constants/endpoints";

export const login = async (dto: LoginDto): Promise<AuthTokens> => {
  const res = await apiClient.post<{ data: AuthTokens }>(
    API_ENDPOINTS.auth.login,
    dto,
  );
  return res.data.data;
};

export const register = async (dto: RegisterDto): Promise<AuthTokens> => {
  const res = await apiClient.post<{ data: AuthTokens }>(
    API_ENDPOINTS.auth.register,
    dto,
  );
  return res.data.data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post(API_ENDPOINTS.auth.logout);
};
