import apiClient from "@/lib/api-client";
import type {
  AuthTokens,
  LoginDto,
  LoginResponse,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerificationDto,
  TwoFactorSetupResponse,
} from "@/types/api.types";
import { API_ENDPOINTS } from "@/constants/endpoints";

export const login = async (dto: LoginDto): Promise<LoginResponse> => {
  const res = await apiClient.post<{ data: LoginResponse }>(
    API_ENDPOINTS.auth.login,
    dto,
  );
  return res.data.data;
};

export const verifyTwoFactorLogin = async (
  twoFactorToken: string,
  token: string,
): Promise<AuthTokens> => {
  const res = await apiClient.post<{ data: AuthTokens }>(
    API_ENDPOINTS.auth.twoFactor.verifyLogin,
    { twoFactorToken, token },
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

export const verifyEmail = async (
  token: string,
): Promise<{ message: string }> => {
  const res = await apiClient.get<{ data: { message: string } }>(
    `${API_ENDPOINTS.auth.verifyEmail}?token=${token}`,
  );
  return res.data.data;
};

export const resendVerification = async (
  dto: ResendVerificationDto,
): Promise<{ message: string }> => {
  const res = await apiClient.post<{ data: { message: string } }>(
    API_ENDPOINTS.auth.resendVerification,
    dto,
  );
  return res.data.data;
};

export const setup2fa = async (
  regenerate?: boolean,
): Promise<TwoFactorSetupResponse> => {
  const url = regenerate
    ? `${API_ENDPOINTS.auth.twoFactor.setup}?regenerate=true`
    : API_ENDPOINTS.auth.twoFactor.setup;
  const res = await apiClient.post<{ data: TwoFactorSetupResponse }>(url);
  return res.data.data;
};

export const enable2fa = async (
  token: string,
): Promise<{ message: string }> => {
  const res = await apiClient.post<{ data: { message: string } }>(
    API_ENDPOINTS.auth.twoFactor.enable,
    { token },
  );
  return res.data.data;
};

export const disable2fa = async (
  token: string,
): Promise<{ message: string }> => {
  const res = await apiClient.post<{ data: { message: string } }>(
    API_ENDPOINTS.auth.twoFactor.disable,
    { token },
  );
  return res.data.data;
};
