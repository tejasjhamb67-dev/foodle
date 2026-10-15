import { dateForNumber, fameForDate } from "./puzzle";
import { hashString, mulberry32 } from "./random";

export interface Candidate {
  id: string;
  fame: 1 | 2 | 3;
  /** Grouping that must not repeat on consecutive days (country, or state in India modes). */
  group: string;
}

/**
 * Builds a deterministic daily sequence.
 * - Difficulty by weekday (fame tier); falls back to the nearest tier when a tier is empty.
 * - An item is not repeated until every item of its tier has been used.
 * - The same group (country / state) is never the answer two days running.
 * Pure and seeded, so every server instance agrees on the answer for a given day.
 */
export function buildSchedule(pool: Candidate[], days: number, launch: string, seed: string): string[] {
  const rnd = mulberry32(hashString(seed));
  const byTier: Record<number, Candidate[]> = { 1: [], 2: [], 3: [] };
  for (const c of [...pool].sort((a, b) => a.id.localeCompare(b.id))) byTier[c.fame].push(c);
  const used: Record<number, Set<string>> = { 1: new Set(), 2: new Set(), 3: new Set() };
  const out: string[] = [];
  let prevGroup = "";
  for (let n = 1; n <= days; n++) {
    const want = fameForDate(dateForNumber(n, launch));
    const order = [want, ...[1, 2, 3].filter((t) => t !== want).sort((a, b) => Math.abs(a - want) - Math.abs(b - want))];
    let pick: Candidate | undefined;
    for (const tier of order) {
      const all = byTier[tier];
      if (!all.length) continue;
      if (used[tier].size >= all.length) used[tier].clear();
      let options = all.filter((c) => !used[tier].has(c.id) && c.group !== prevGroup);
      if (!options.length) options = all.filter((c) => c.group !== prevGroup);
      if (!options.length) options = all;
      pick = options[Math.floor(rnd() * options.length)];
      used[tier].add(pick.id);
      break;
    }
    if (!pick) throw new Error("Empty answer pool");
    out.push(pick.id);
    prevGroup = pick.group;
  }
  return out;
}
