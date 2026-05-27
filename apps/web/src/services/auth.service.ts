import apiClient from "@/lib/api-client";
import type { AuthTokens, LoginDto, RegisterDto } from "@/types/api.types";
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
