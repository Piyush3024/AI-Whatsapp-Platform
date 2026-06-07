export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  path: string;
}

export interface ApiError {
  statusCode: number;
  errorCode: string;
  message: string;
  errorId: string;
  timestamp: string;
  path: string;
}

// Pagination
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type UserRole = "OWNER" | "ADMIN" | "STAFF";

// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  twoFactorEnabled: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  twoFactorToken: string;
}

export type LoginResponse = AuthTokens | TwoFactorChallenge;

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  businessName: string;
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ResendVerificationDto {
  email: string;
}

export interface TwoFactorSetupResponse {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
}
