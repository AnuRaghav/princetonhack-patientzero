import { create } from "zustand";

type SimUiState = {
  bodyHighlight: string | null;
  setBodyHighlight: (value: string | null) => void;
};

/** Lightweight UI state shared between the sim layout and the R3F canvas. */
export const useSimUiStore = create<SimUiState>((set) => ({
  bodyHighlight: null,
  setBodyHighlight: (value) => set({ bodyHighlight: value }),
}));
