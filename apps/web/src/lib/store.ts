"use client";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AnswerCard, Edition, GuessRow, Mode } from "@foodle/game";

export interface GameState {
  mode: Mode;
  edition: Edition;
  number: number;
  rows: GuessRow[];
  clues: string[];
  clueCount: number;
  finished: boolean;
  won: boolean;
  answer?: AnswerCard;
  /** True when started on its own day; archive plays never count towards stats (spec 2.2). */
  daily: boolean;
  startedAt: number;
  finishedAt?: number;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  highContrast: boolean;
  motion: "system" | "reduced" | "full";
  defaultEdition: Edition;
}

interface State {
  settings: Settings;
  onboarded: boolean;
  last: { edition: Edition; mode: Mode } | null;
  games: Record<string, GameState>;
  signInPromptSeen: number;
  setSettings(p: Partial<Settings>): void;
  setOnboarded(): void;
  setLast(edition: Edition, mode: Mode): void;
  saveGame(g: GameState): void;
  setSignInPromptSeen(streak: number): void;
}

export const gameKey = (edition: Edition, mode: Mode, number: number) => `${edition}:${mode}:${number}`;

// Storage can throw in private windows; fall back to memory so the game still runs.
const safeStorage = createJSONStorage(() => {
  try {
    const k = "__foodle_probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  }
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      settings: { theme: "system", highContrast: false, motion: "system", defaultEdition: "global" },
      onboarded: false,
      last: null,
      games: {},
      signInPromptSeen: 0,
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setOnboarded: () => set({ onboarded: true }),
      setLast: (edition, mode) => set({ last: { edition, mode } }),
      saveGame: (g) => set((s) => ({ games: { ...s.games, [gameKey(g.edition, g.mode, g.number)]: g } })),
      setSignInPromptSeen: (streak) => set({ signInPromptSeen: streak }),
    }),
    { name: "foodle", storage: safeStorage, version: 1 },
  ),
);

/** Wait for persisted state before rendering game UI, to avoid flashing an empty board. */
export function useHydrated() {
  const [h, setH] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setH(true);
    return useStore.persist.onFinishHydration(() => setH(true));
  }, []);
  return h;
}
