// Standard API response shapes from apps/api TransformInterceptor
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

// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  tenantId: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}
