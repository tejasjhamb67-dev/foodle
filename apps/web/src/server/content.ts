import "server-only";
import itemsJson from "@foodle/content/data/items.json";
import countriesJson from "@foodle/content/data/countries.json";
import statesJson from "@foodle/content/data/states.json";
import {
  buildSchedule,
  columnsFor,
  countryFeedback,
  dateForNumber,
  hashString,
  haversine,
  itemFeedback,
  MAX_GUESSES,
  mulberry32,
  sharedIngredients,
  stateFeedback,
  type AnswerCard,
  type Candidate,
  type Country,
  type Edition,
  type GuessOption,
  type GuessRow,
  type IndiaState,
  type Item,
  type Mode,
  type PuzzleInfo,
} from "@foodle/game";
import { LAUNCH_DATE } from "@/lib/config";

const items = itemsJson as Item[];
const countries = countriesJson as Country[];
const states = statesJson as IndiaState[];

const itemById = new Map(items.map((i) => [i.id, i]));
const countryByIso2 = new Map(countries.map((c) => [c.iso2, c]));
const stateById = new Map(states.map((s) => [stateId(s.name), s]));
const geo = { countryByIso2: (iso: string) => countryByIso2.get(iso) };

export function stateId(name: string) {
  return "S-" + name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-");
}

const SECRET = process.env.FOODLE_SCHEDULE_SECRET ?? "foodle-dev-schedule";

interface ModeDef {
  answers: Item[];
  group: (i: Item) => string;
  options: GuessOption[];
}

const isIndia = (i: Item) => i.country === "India";

function itemOption(i: Item, edition: Edition): GuessOption {
  const place = edition === "india" ? i.state ?? "India" : i.country;
  return { id: i.id, name: i.name, aliases: i.aliases, meta: `${place} · ${i.course ?? i.type ?? ""}` };
}

function build(mode: Mode, edition: Edition): ModeDef {
  if (mode === "cuisine") {
    if (edition === "global") {
      return {
        answers: items.filter(
          (i) => i.kind === "dish" && !isIndia(i) && i.modes.country && i.puzzleReady && countryByIso2.has(i.iso2),
        ),
        group: (i) => i.iso2,
        options: countries
          .map((c) => ({ id: c.iso2, name: c.name, aliases: c.official !== c.name ? [c.official] : [], meta: `${c.flag} ${c.subregion || c.region}` }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    }
    return {
      answers: items.filter(
        (i) => i.kind === "dish" && isIndia(i) && i.modes.country && i.puzzleReady && i.state && stateById.get(stateId(i.state))?.lat != null,
      ),
      group: (i) => i.state!,
      options: states.map((s) => ({ id: stateId(s.name), name: s.name, aliases: [], meta: s.zone })),
    };
  }
  const kind = mode === "dish" ? "dish" : "drink";
  const pool = items.filter((i) => i.kind === kind);
  const answers = pool.filter((i) => i.puzzleReady && (edition === "global" ? i.modes.global : i.modes.india));
  const guessable = edition === "global" ? pool : pool.filter(isIndia);
  return {
    answers,
    group: (i) => (edition === "india" ? i.state ?? "" : i.country),
    options: guessable.map((i) => itemOption(i, edition)).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

const defs = new Map<string, ModeDef>();
function def(mode: Mode, edition: Edition): ModeDef {
  const key = `${mode}:${edition}`;
  let d = defs.get(key);
  if (!d) defs.set(key, (d = build(mode, edition)));
  return d;
}

const schedules = new Map<string, string[]>();
/** The answer item (or clue dish, in cuisine modes) for a puzzle number. */
export function answerFor(mode: Mode, edition: Edition, number: number): Item {
  const key = `${mode}:${edition}`;
  let s = schedules.get(key);
  if (!s || s.length < number) {
    const d = def(mode, edition);
    const pool: Candidate[] = d.answers.map((i) => ({ id: i.id, fame: i.fame, group: d.group(i) }));
    s = buildSchedule(pool, Math.ceil(number / 365) * 365 + 365, LAUNCH_DATE, `${SECRET}:${key}`);
    schedules.set(key, s);
  }
  return itemById.get(s[number - 1])!;
}

export function guessList(mode: Mode, edition: Edition) {
  const options = def(mode, edition).options;
  return { version: guessListVersion(mode, edition), options };
}

export function guessListVersion(mode: Mode, edition: Edition) {
  return hashString(JSON.stringify(def(mode, edition).options)).toString(36);
}

export function isValidGuess(mode: Mode, edition: Edition, id: string): boolean {
  return def(mode, edition).options.some((o) => o.id === id);
}

export function puzzleInfo(mode: Mode, edition: Edition, number: number): PuzzleInfo {
  const a = answerFor(mode, edition, number);
  return {
    mode,
    edition,
    number,
    date: dateForNumber(number, LAUNCH_DATE),
    clues: a.clues.slice(0, 1),
    clueCount: a.clues.length,
    columns: columnsFor(mode, edition),
    guessListVersion: guessListVersion(mode, edition),
  };
}

function rowFor(mode: Mode, edition: Edition, answer: Item, guessId: string): GuessRow {
  if (mode === "cuisine") {
    if (edition === "global") {
      const g = countryByIso2.get(guessId)!;
      const a = countryByIso2.get(answer.iso2)!;
      return { guessId, name: g.name, tiles: countryFeedback(g, a), correct: g.iso2 === a.iso2 };
    }
    const g = stateById.get(guessId)!;
    const a = stateById.get(stateId(answer.state!))!;
    return { guessId, name: g.name, tiles: stateFeedback(g, a), correct: g.name === a.name };
  }
  const g = itemById.get(guessId)!;
  return { guessId, name: g.name, tiles: itemFeedback(g, answer, edition, geo), correct: g.id === answer.id };
}

function answerCard(mode: Mode, edition: Edition, a: Item): AnswerCard {
  const c = countryByIso2.get(a.iso2);
  const card: AnswerCard = {
    id: a.id,
    name: a.name,
    aliases: a.aliases,
    kind: a.kind,
    country: a.country === "Turkey" ? "Türkiye" : a.country,
    flag: c?.flag,
    state: a.state,
    course: a.course,
    diet: a.diet,
    type: a.type,
    alcoholic: a.alcoholic,
    serve: a.serve,
    clues: a.clues,
    ingredients: a.ingredients,
    hints: a.hints,
    originNote: a.originNote,
    imageSearch: a.imageSearch,
    image: a.image,
  };
  if (mode === "cuisine") {
    card.target =
      edition === "global" ? { id: a.iso2, name: c!.name, flag: c!.flag } : { id: stateId(a.state!), name: a.state! };
  }
  return card;
}

export class GuessError extends Error {
  constructor(
    public code: "not_in_list" | "repeat" | "too_many" | "bad_request",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Stateless evaluation: the client sends every guess so far; the server replays them.
 * The answer is only included once the puzzle has ended.
 */
export function evaluate(mode: Mode, edition: Edition, number: number, guesses: string[]) {
  if (!guesses.length) throw new GuessError("bad_request", "No guess");
  if (guesses.length > MAX_GUESSES) throw new GuessError("too_many", "No guesses left");
  const seen = new Set<string>();
  for (const id of guesses) {
    if (!isValidGuess(mode, edition, id)) throw new GuessError("not_in_list", "Not in list");
    if (seen.has(id)) throw new GuessError("repeat", "Already guessed");
    seen.add(id);
  }
  const answer = answerFor(mode, edition, number);
  const rows = guesses.map((g) => rowFor(mode, edition, answer, g));
  const winAt = rows.findIndex((r) => r.correct);
  if (winAt >= 0 && winAt < rows.length - 1) throw new GuessError("bad_request", "Puzzle already solved");
  const won = winAt >= 0;
  const finished = won || rows.length >= MAX_GUESSES;
  const wrong = rows.filter((r) => !r.correct).length;
  const clues = finished ? answer.clues : answer.clues.slice(0, Math.min(answer.clues.length, 1 + wrong));
  return {
    rows,
    clues,
    clueCount: answer.clues.length,
    finished,
    won,
    answer: finished ? answerCard(mode, edition, answer) : undefined,
  };
}

/** Mini squares for leaderboards (spec 11.2): green = correct; yellow = right country (Global) or zone (India). */
export function miniSquares(rows: GuessRow[]): ("correct" | "present" | "absent")[] {
  return rows.map((r) => {
    if (r.correct) return "correct";
    const t = r.tiles[0];
    return t.state === "correct" ? "present" : "absent";
  });
}

/** Options mode unlocks once this many guesses have been used (i.e. for the last two guesses). */
export const OPTIONS_AFTER = MAX_GUESSES - 2;
const OPTION_COUNT = 4;

/** How alike a candidate is to the answer, so decoys are plausible rather than random. */
function similarity(mode: Mode, edition: Edition, answer: Item, id: string): number {
  if (mode === "cuisine") {
    if (edition === "global") {
      const a = countryByIso2.get(answer.iso2)!;
      const c = countryByIso2.get(id)!;
      return (c.subregion === a.subregion ? 3 : 0) + (c.region === a.region ? 2 : 0) - haversine(a, c) / 3000;
    }
    const a = stateById.get(stateId(answer.state!))!;
    const c = stateById.get(id)!;
    const d = a.lat != null && c.lat != null ? haversine(a as never, c as never) / 600 : 3;
    return (c.zone === a.zone ? 3 : 0) - d;
  }
  const c = itemById.get(id)!;
  const place = edition === "india" ? (c.state === answer.state ? 3 : 0) + (c.zone === answer.zone ? 2 : 0) : (c.country === answer.country ? 3 : 0) + (c.continent === answer.continent ? 1 : 0);
  const kind = c.course ? (c.course === answer.course ? 1 : 0) + (c.diet === answer.diet ? 1 : 0) : (c.type === answer.type ? 1 : 0) + (c.alcoholic === answer.alcoholic ? 1 : 0);
  return place + kind + Math.min(3, sharedIngredients(c, answer));
}

/**
 * Multiple choice for the last two guesses (opt-in). The four options are fixed by the first
 * four guesses, so the set only shrinks as the player rules options out. The answer's position
 * and the decoys are seeded per puzzle, so every player sees the same choices for the same board.
 */
export function optionsFor(mode: Mode, edition: Edition, number: number, guesses: string[]) {
  const result = evaluate(mode, edition, number, guesses);
  if (result.finished) throw new GuessError("bad_request", "Puzzle already finished");
  if (guesses.length < OPTIONS_AFTER) throw new GuessError("bad_request", `Options open after ${OPTIONS_AFTER} guesses`);
  const answer = answerFor(mode, edition, number);
  const answerId = mode === "cuisine" ? (edition === "global" ? answer.iso2 : stateId(answer.state!)) : answer.id;
  const early = new Set(guesses.slice(0, OPTIONS_AFTER));
  const rnd = mulberry32(hashString(`${SECRET}:options:${mode}:${edition}:${number}:${[...early].sort().join(",")}`));
  const pool = def(mode, edition)
    .options.filter((o) => o.id !== answerId && !early.has(o.id))
    .map((o) => ({ o, score: similarity(mode, edition, answer, o.id) + rnd() * 0.5 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  // Pick decoys from the closest eight, so they're tempting but not always the single nearest.
  const decoys: GuessOption[] = [];
  while (decoys.length < OPTION_COUNT - 1 && pool.length) decoys.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].o);
  const all = [...decoys, def(mode, edition).options.find((o) => o.id === answerId)!];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const guessed = new Set(guesses);
  return all.filter((o) => !guessed.has(o.id));
}
