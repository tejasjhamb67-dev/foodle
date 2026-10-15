export interface PlayRecord {
  number: number;
  won: boolean;
  guesses: number;
}

export interface Stats {
  played: number;
  winPct: number;
  currentStreak: number;
  maxStreak: number;
  distribution: number[]; // index 0..5 = solved in 1..6, index 6 = X
}

/** Spec 10.2. `today` is today's puzzle number. Archive plays must not be passed in. */
export function computeStats(records: PlayRecord[], today: number): Stats {
  const byNo = new Map(records.map((r) => [r.number, r]));
  const distribution = [0, 0, 0, 0, 0, 0, 0];
  let won = 0;
  for (const r of records) {
    if (r.won) {
      won++;
      distribution[Math.min(6, r.guesses) - 1]++;
    } else distribution[6]++;
  }
  // Max streak: longest run of consecutive won numbers.
  const wins = records.filter((r) => r.won).map((r) => r.number).sort((a, b) => a - b);
  let maxStreak = 0;
  let run = 0;
  for (let i = 0; i < wins.length; i++) {
    run = i > 0 && wins[i] === wins[i - 1] + 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
  }
  // Current streak: consecutive wins ending today or yesterday.
  let start = byNo.get(today)?.won ? today : today - 1;
  let currentStreak = 0;
  while (byNo.get(start)?.won) {
    currentStreak++;
    start--;
  }
  return {
    played: records.length,
    winPct: records.length ? Math.round((won / records.length) * 100) : 0,
    currentStreak,
    maxStreak,
    distribution,
  };
}

/** Consecutive days (by puzzle number) with at least one daily win in any mode. */
export function allModeStreak(winsByNumber: Set<number>, today: number): number {
  let n = winsByNumber.has(today) ? today : today - 1;
  let s = 0;
  while (winsByNumber.has(n)) {
    s++;
    n--;
  }
  return s;
}
