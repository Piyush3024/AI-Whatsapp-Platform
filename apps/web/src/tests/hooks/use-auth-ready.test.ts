import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useIsAuthReady } from "@/hooks/use-auth-ready";
import { useAuthStore } from "@/stores/auth.store";
import type { AuthState } from "@/stores/auth.store";

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

describe("useIsAuthReady", () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockReset();
  });

  const mockStoreState = (overrides: Partial<AuthState>) => {
    vi.mocked(useAuthStore).mockImplementation(<U>(
      selector: (state: AuthState) => U
    ): U => {
      const mockState: AuthState = {
        user: null,
        accessToken: null,
        isInitialized: false,
        pendingTwoFactorToken: null,
        setAuth: () => {},
        updateUser: () => {},
        clearAuth: () => {},
        setInitialized: () => {},
        setPendingTwoFactor: () => {},
        clearPendingTwoFactor: () => {},
        ...overrides,
      };
      return selector(mockState);
    });
  };

  it("returns false when isInitialized=false and accessToken=null", () => {
    mockStoreState({ isInitialized: false, accessToken: null });
    const { result } = renderHook(() => useIsAuthReady());
    expect(result.current).toBe(false);
  });

  it("returns false when isInitialized=true and accessToken=null", () => {
    mockStoreState({ isInitialized: true, accessToken: null });
    const { result } = renderHook(() => useIsAuthReady());
    expect(result.current).toBe(false);
  });

  it("returns false when isInitialized=false and accessToken=\"token\"", () => {
    mockStoreState({ isInitialized: false, accessToken: "token" });
    const { result } = renderHook(() => useIsAuthReady());
    expect(result.current).toBe(false);
  });

  it("returns true when isInitialized=true and accessToken=\"token\"", () => {
    mockStoreState({ isInitialized: true, accessToken: "token" });
    const { result } = renderHook(() => useIsAuthReady());
    expect(result.current).toBe(true);
  });
});
