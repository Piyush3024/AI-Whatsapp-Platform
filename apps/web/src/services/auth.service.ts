import apiClient from "@/lib/api-client";
import type {
  AuthTokens,
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "@/types/api.types";
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

export const forgotPassword = async (
  dto: ForgotPasswordDto,
): Promise<{ message: string }> => {
  const res = await apiClient.post<{ data: { message: string } }>(
    API_ENDPOINTS.auth.forgotPassword,
    dto,
  );
  return res.data.data;
};

export const resetPassword = async (
  dto: ResetPasswordDto,
): Promise<{ message: string }> => {
  const res = await apiClient.post<{ data: { message: string } }>(
    API_ENDPOINTS.auth.resetPassword,
    dto,
  );
  return res.data.data;
};
