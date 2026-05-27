import { create } from "zustand";

import type { User } from "@/types/api.types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isInitialized: boolean;
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken?: string | null,
  ) => void;
  clearAuth: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isInitialized: false,
  setAuth: (user, accessToken, refreshToken = null) =>
    set({ user, accessToken, refreshToken }),
  clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
  setInitialized: () => set({ isInitialized: true }),
}));
