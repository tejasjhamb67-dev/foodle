/**
 * Repository workbook → JSON seed (spec 13.1 packages/content).
 * Usage: pnpm content:import [path/to/workbook.xlsx]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { zoneForState, type Country, type IndiaState, type Item } from "@foodle/game";
import { STATE_COORDS } from "./state-coords";

const here = dirname(fileURLToPath(import.meta.url));
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const src = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? join(here, "../source/Foodle_Starter_Repository.xlsx");
// --include-candidates also attaches images that haven't been reviewed yet (preview builds only).
const includeCandidates = flags.includes("--include-candidates");
const out = join(here, "../data");
const wb = XLSX.read(readFileSync(src));

type Row = Record<string, unknown>;
const sheet = (name: string): Row[] => XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { defval: null });
const str = (v: unknown) => (v == null ? "" : String(v).trim());
const list = (v: unknown, sep: string | RegExp = ";") =>
  str(v)
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
const yes = (v: unknown) => str(v).toLowerCase() === "yes";

// Item country names that differ from the Countries sheet.
const COUNTRY_ALIASES: Record<string, string> = { Turkey: "Türkiye" };

const countries: Country[] = sheet("Countries").map((r) => ({
  name: str(r["Country"]),
  official: str(r["Official name"]),
  iso2: str(r["ISO2"]),
  iso3: str(r["ISO3"]),
  region: str(r["Region"]),
  subregion: str(r["Subregion"]),
  lat: Number(r["Latitude"]),
  lng: Number(r["Longitude"]),
  borders: list(r["Borders (ISO3)"], ",").filter((b) => b !== "UNK"),
  flag: str(r["Flag"]),
}));
const countryByName = new Map(countries.map((c) => [c.name, c]));

const warnings: string[] = [];

function toItem(r: Row, kind: "dish" | "drink"): Item {
  const name = str(r[kind === "dish" ? "Dish" : "Drink"]);
  const countryName = str(r["Country"]);
  const ref = countryByName.get(COUNTRY_ALIASES[countryName] ?? countryName);
  if (!ref && countryName !== "International") warnings.push(`${r["ID"]} ${name}: unknown country "${countryName}"`);
  const clues: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const c = str(r[`Clue ${i}`]);
    if (c) clues.push(c);
  }
  const state = str(r["State / region"]) || undefined;
  const hints = list(r["Non-ingredient hints"]);
  const fame = Number(r["Fame (1-3)"]) as 1 | 2 | 3;
  const item: Item = {
    id: str(r["ID"]),
    kind,
    name,
    aliases: list(r["Also known as"], /[;,]/),
    country: countryName,
    iso2: ref?.iso2 ?? "",
    continent: str(r["Continent"]),
    subregion: str(r["Subregion"]),
    state,
    zone: countryName === "India" ? zoneForState(state) : undefined,
    fame,
    clues,
    ingredients: list(r["Ingredients"]),
    hints,
    puzzleReady: yes(r["Puzzle ready"]),
    modes: { global: yes(r["Global mode"]), india: yes(r["India mode"]), country: yes(r["Country mode"]) },
    originNote: str(r["Origin note"]) || undefined,
    imageSearch: str(r["Image search (Wikimedia)"]) || undefined,
  };
  if (kind === "dish") {
    item.course = str(r["Course"]);
    item.diet = str(r["Diet"]) as Item["diet"];
  } else {
    item.type = str(r["Type"]);
    item.alcoholic = yes(r["Alcoholic"]);
    item.serve = str(r["Glass / serve"]) || undefined;
  }
  const url = str(r["Image URL"]);
  if (url) {
    item.image = { url, w: 0, h: 0, licence: str(r["Image licence"]), author: str(r["Image credit"]), sourceUrl: url };
  }
  if (countryName === "India" && !item.zone) warnings.push(`${item.id} ${name}: no zone for state "${state}"`);
  return item;
}

const items: Item[] = [
  ...sheet("Dishes").filter((r) => r["ID"]).map((r) => toItem(r, "dish")),
  ...sheet("Drinks").filter((r) => r["ID"]).map((r) => toItem(r, "drink")),
];

// Images sourced by scripts/images.ts take precedence over empty workbook cells.
const imagesPath = join(out, "images.json");
if (existsSync(imagesPath)) {
  // Only reviewer-approved images go live (design system §9.3, step 3).
  const images = JSON.parse(readFileSync(imagesPath, "utf8")) as Record<string, NonNullable<Item["image"]> & { status?: string }>;
  for (const it of items) {
    const img = images[it.id];
    if (!it.image && img && (img.status === "approved" || includeCandidates)) {
      const { status: _status, ...rest } = img;
      it.image = rest;
    }
  }
} else {
  writeFileSync(imagesPath, "{}\n");
}

const states: IndiaState[] = sheet("India States")
  .map((r) => str(r["State / region"]))
  .filter(Boolean)
  .map((name) => {
    const c = STATE_COORDS[name];
    return { name, zone: zoneForState(name) ?? "Pan-India", lat: c?.[0], lng: c?.[1] };
  });

writeFileSync(join(out, "items.json"), JSON.stringify(items));
writeFileSync(join(out, "countries.json"), JSON.stringify(countries));
writeFileSync(join(out, "states.json"), JSON.stringify(states, null, 1));

const dishes = items.filter((i) => i.kind === "dish");
const drinks = items.filter((i) => i.kind === "drink");
console.log(`Dishes ${dishes.length} (ready ${dishes.filter((d) => d.puzzleReady).length})`);
console.log(`Drinks ${drinks.length} (ready ${drinks.filter((d) => d.puzzleReady).length})`);
console.log(`Countries ${countries.length}, India states ${states.length}`);
if (warnings.length) console.warn(`Warnings (${warnings.length}):\n  ` + warnings.join("\n  "));
