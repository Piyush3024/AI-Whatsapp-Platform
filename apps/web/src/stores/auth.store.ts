import { create } from "zustand";

import type { User } from "@/types/api.types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isInitialized: boolean;
  pendingTwoFactorToken: string | null;
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken?: string | null,
  ) => void;
  updateUser: (partial: Partial<User>) => void;
  clearAuth: () => void;
  setInitialized: () => void;
  setPendingTwoFactor: (token: string | null) => void;
  clearPendingTwoFactor: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isInitialized: false,
  pendingTwoFactorToken: null,
  setAuth: (user, accessToken, refreshToken = null) =>
    set({ user, accessToken, refreshToken }),
  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : state.user,
    })),
  clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
  setInitialized: () => set({ isInitialized: true }),
  setPendingTwoFactor: (token) => set({ pendingTwoFactorToken: token }),
  clearPendingTwoFactor: () => set({ pendingTwoFactorToken: null }),
}));
