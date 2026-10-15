"use client";
import { allModeStreak, computeStats, type Edition, type Mode } from "@foodle/game";
import type { GameState } from "./store";

export function dailyRecords(games: Record<string, GameState>, edition: Edition, mode: Mode) {
  return Object.values(games)
    .filter((g) => g.daily && g.finished && g.edition === edition && g.mode === mode)
    .map((g) => ({ number: g.number, won: g.won, guesses: g.rows.length }));
}

export function statsFor(games: Record<string, GameState>, edition: Edition, mode: Mode, today: number) {
  return computeStats(dailyRecords(games, edition, mode), today);
}

export function overallStreak(games: Record<string, GameState>, today: number) {
  const wins = new Set(Object.values(games).filter((g) => g.daily && g.won).map((g) => g.number));
  return allModeStreak(wins, today);
}
