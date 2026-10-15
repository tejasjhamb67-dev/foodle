export type Edition = "global" | "india";
export type Mode = "dish" | "drink" | "cuisine";
export type TileState = "correct" | "present" | "absent";
export type Diet = "Veg" | "Vegan" | "Egg" | "Non-veg";

export interface ItemImage {
  url: string;
  w: number;
  h: number;
  blurhash?: string;
  focal?: [number, number];
  licence: string;
  author: string;
  sourceUrl: string;
}

/** A dish or drink, as stored on the server. */
export interface Item {
  id: string;
  kind: "dish" | "drink";
  name: string;
  aliases: string[];
  country: string;
  iso2: string;
  continent: string;
  subregion: string;
  state?: string;
  zone?: string;
  course?: string;
  diet?: Diet;
  type?: string;
  alcoholic?: boolean;
  serve?: string;
  fame: 1 | 2 | 3;
  clues: string[];
  ingredients: string[];
  hints: string[];
  puzzleReady: boolean;
  modes: { global: boolean; india: boolean; country: boolean };
  originNote?: string;
  imageSearch?: string;
  image?: ItemImage;
}

export interface Country {
  name: string;
  official: string;
  iso2: string;
  iso3: string;
  region: string;
  subregion: string;
  lat: number;
  lng: number;
  borders: string[];
  flag: string;
}

export interface IndiaState {
  name: string;
  zone: string;
  lat?: number;
  lng?: number;
}

/** One entry in the autocomplete list. Never carries clues or ingredients. */
export interface GuessOption {
  id: string;
  name: string;
  aliases: string[];
  meta: string;
}

export interface Tile {
  key: string;
  label: string;
  state: TileState;
  value: string;
  sub?: string;
  a11y: string;
}

export interface GuessRow {
  guessId: string;
  name: string;
  tiles: Tile[];
  correct: boolean;
}

/** The public answer card, sent only once the puzzle has ended. */
export interface AnswerCard {
  id: string;
  name: string;
  aliases: string[];
  kind: "dish" | "drink";
  country: string;
  flag?: string;
  state?: string;
  course?: string;
  diet?: string;
  type?: string;
  alcoholic?: boolean;
  serve?: string;
  clues: string[];
  ingredients: string[];
  hints: string[];
  originNote?: string;
  imageSearch?: string;
  image?: ItemImage;
  /** In cuisine modes: the country or state the player had to find. */
  target?: { id: string; name: string; flag?: string };
}

export interface GuessResult {
  row: GuessRow;
  clues: string[];
  clueCount: number;
  finished: boolean;
  won: boolean;
  answer?: AnswerCard;
}

export interface PuzzleInfo {
  mode: Mode;
  edition: Edition;
  number: number;
  date: string;
  clues: string[];
  clueCount: number;
  columns: { key: string; label: string }[];
  guessListVersion: string;
}
