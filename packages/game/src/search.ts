import type { GuessOption } from "./types";

/** Lowercase, strip accents and punctuation (spec 4: Autocomplete). */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Indexed extends GuessOption {
  keys: string[];
}

export function indexOptions(options: GuessOption[]): Indexed[] {
  return options.map((o) => ({ ...o, keys: [o.name, ...o.aliases].map(normalize) }));
}

/** Prefix matches (on a whole name or a word) rank above infix matches; max `limit` rows. */
export function search(index: Indexed[], query: string, exclude: Set<string> = new Set(), limit = 5): Indexed[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { o: Indexed; score: number }[] = [];
  for (const o of index) {
    if (exclude.has(o.id)) continue;
    let best = Infinity;
    for (const [i, k] of o.keys.entries()) {
      let s = Infinity;
      if (k === q) s = 0;
      else if (k.startsWith(q)) s = 1;
      else if (k.split(" ").some((w) => w.startsWith(q))) s = 2;
      else if (k.includes(q)) s = 3;
      if (s < Infinity) s = s * 2 + (i === 0 ? 0 : 1);
      best = Math.min(best, s);
    }
    if (best < Infinity) scored.push({ o, score: best });
  }
  scored.sort((a, b) => a.score - b.score || a.o.name.length - b.o.name.length || a.o.name.localeCompare(b.o.name));
  return scored.slice(0, limit).map((s) => s.o);
}

/** Exact match on name or alias, used when the player presses Enter on free text. */
export function exactMatch(index: Indexed[], query: string): Indexed | undefined {
  const q = normalize(query);
  return index.find((o) => o.keys.includes(q));
}
