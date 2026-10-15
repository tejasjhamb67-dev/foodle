import "server-only";
import { addDays, puzzleNumber } from "@foodle/game";
import { LAUNCH_DATE } from "@/lib/config";

/** Highest puzzle number any time zone can be on right now (UTC+14). */
export function maxPlayableNumber(now = new Date()): number {
  const utc = now.toISOString().slice(0, 10);
  return puzzleNumber(addDays(utc, 1), LAUNCH_DATE);
}

export function isPlayable(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= maxPlayableNumber();
}
