import { EDITIONS, MODES, type Edition, type Mode } from "@foodle/game";

export function parseMode(v: unknown): Mode | null {
  return MODES.includes(v as Mode) ? (v as Mode) : null;
}
export function parseEdition(v: unknown): Edition | null {
  return EDITIONS.includes(v as Edition) ? (v as Edition) : null;
}
