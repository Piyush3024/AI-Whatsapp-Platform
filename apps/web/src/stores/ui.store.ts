import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Persisted open/close state for collapsible nav groups
  settingsGroupOpen: boolean;
  setSettingsGroupOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      settingsGroupOpen: false,
      setSettingsGroupOpen: (open) => set({ settingsGroupOpen: open }),
    }),
    {
      name: "ui-store",
      // Persist both collapsed state and settings group open state
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        settingsGroupOpen: state.settingsGroupOpen,
      }),
    },
  ),
);
