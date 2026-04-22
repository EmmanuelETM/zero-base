import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UIStore {
  /** Whether the ⌘K command menu is open */
  commandMenuOpen: boolean;
  setCommandMenuOpen: (open: boolean) => void;
  toggleCommandMenu: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>((set) => ({
  commandMenuOpen: false,
  setCommandMenuOpen: (open) => set({ commandMenuOpen: open }),
  toggleCommandMenu: () =>
    set((state) => ({ commandMenuOpen: !state.commandMenuOpen })),
}));
