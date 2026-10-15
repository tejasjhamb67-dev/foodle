import type { Edition, Mode } from "./types";

const DAY = 86_400_000;

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

export function dayIndex(date: string): number {
  return Math.floor(Date.parse(date + "T00:00:00Z") / DAY);
}

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
}

/** Spec 2.2: Puzzle No. = days since launch day + 1. */
export function puzzleNumber(date: string, launch: string): number {
  return dayIndex(date) - dayIndex(launch) + 1;
}

export function dateForNumber(n: number, launch: string): string {
  return addDays(launch, n - 1);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(date: string): number {
  return new Date(date + "T00:00:00Z").getUTCDay();
}

/** Spec (concept note §5): Mon, Tue, Sun → fame 1; Wed, Thu, Sat → 2; Fri → 3. */
export function fameForDate(date: string): 1 | 2 | 3 {
  const d = weekday(date);
  if (d === 5) return 3;
  if (d === 3 || d === 4 || d === 6) return 2;
  return 1;
}

/** The player's local calendar date (YYYY-MM-DD). */
export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function msUntilLocalMidnight(d = new Date()): number {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return next.getTime() - d.getTime();
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export const MODES: Mode[] = ["dish", "drink", "cuisine"];
export const EDITIONS: Edition[] = ["global", "india"];
export const MAX_GUESSES = 6;

export const MODE_LABEL: Record<Mode, string> = { dish: "Dish", drink: "Drink", cuisine: "Cuisine" };
export const EDITION_LABEL: Record<Edition, string> = { global: "Global", india: "India" };

export function placeholderFor(mode: Mode, edition: Edition): string {
  if (mode === "dish") return "Type a dish…";
  if (mode === "drink") return "Type a drink…";
  return edition === "global" ? "Type a country…" : "Type a state…";
}

export function notInListCopy(mode: Mode, edition: Edition): string {
  if (mode === "dish") return "Pick a dish from the list";
  if (mode === "drink") return "Pick a drink from the list";
  return edition === "global" ? "Pick a country from the list" : "Pick a state from the list";
}

export const VERDICTS = ["Chef's kiss", "Michelin", "Seasoned", "Well done", "Medium rare", "Just plated"];
export const LOSS_VERDICT = "Back to the kitchen";

export function verdict(won: boolean, guesses: number): string {
  return won ? VERDICTS[Math.min(guesses, 6) - 1] : LOSS_VERDICT;
}
