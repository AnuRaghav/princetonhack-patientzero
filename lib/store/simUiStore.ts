import { create } from "zustand";

export type ActiveNavTab = "console" | "cases" | "encounter" | "debrief";

type SimUiState = {
  bodyHighlight: string | null;
  setBodyHighlight: (value: string | null) => void;
  /**
   * Optional override for the AppShell top nav active state. Lets in-page state
   * (e.g. starting an encounter on `/cases/[slug]`) shift the highlighted tab
   * without changing the URL. `null` defers to the pathname-based default.
   */
  activeNavOverride: ActiveNavTab | null;
  setActiveNavOverride: (value: ActiveNavTab | null) => void;
};

export const useSimUiStore = create<SimUiState>((set) => ({
  bodyHighlight: null,
  setBodyHighlight: (value) => set({ bodyHighlight: value }),
  activeNavOverride: null,
  setActiveNavOverride: (value) => set({ activeNavOverride: value }),
}));
