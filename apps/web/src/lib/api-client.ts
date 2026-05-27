import axios, { type AxiosError } from "axios";

import { useAuthStore } from "@/stores/auth.store";
import { getCookie, setCookie } from "@/lib/cookies";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // HttpOnly refresh cookie auto-send
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — 401 → refresh → retry
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    // Only handle 401 — and avoid infinite loop
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Avoid /auth/refresh itself causing loop
    if (originalRequest.url?.includes("/auth/refresh")) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue requests while refresh is in progress
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const rt = getCookie("refresh_token");
      const response = await apiClient.post<{
        data: {
          accessToken: string;
          refreshToken: string;
          user: import("@/types/api.types").User;
        };
      }>("/auth/refresh", { refreshToken: rt });

      const {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      } = response.data.data;
      useAuthStore.getState().setAuth(user, accessToken, newRefreshToken);
      setCookie("refresh_token", newRefreshToken, 7);

      processQueue(null, accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
