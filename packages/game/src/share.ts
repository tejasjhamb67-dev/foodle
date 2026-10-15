import type { Edition, Mode, TileState } from "./types";
import { EDITION_LABEL, MODE_LABEL } from "./puzzle";

const SQUARES: Record<TileState, string> = { correct: "🟩", present: "🟨", absent: "⬜" };
const HC_SQUARES: Record<TileState, string> = { correct: "🟧", present: "🟦", absent: "⬜" };

export function shareText(opts: {
  number: number;
  edition: Edition;
  mode: Mode;
  rows: TileState[][];
  won: boolean;
  highContrast?: boolean;
  assisted?: boolean;
  url: string;
}): string {
  const sq = opts.highContrast ? HC_SQUARES : SQUARES;
  const score = opts.won ? `${opts.rows.length}/6` : "X/6";
  const head = `Foodle No. ${opts.number} · ${EDITION_LABEL[opts.edition]} · ${MODE_LABEL[opts.mode]} ${score}${opts.assisted ? " · with options" : ""}`;
  const grid = opts.rows.map((r) => r.map((s) => sq[s]).join("")).join("\n");
  return `${head}\n\n${grid}\n\n${opts.url}`;
}
