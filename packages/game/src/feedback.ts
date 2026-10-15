import type { Country, Edition, IndiaState, Item, Tile, TileState } from "./types";
import { abbreviateState, courseFamily, MEAT_FREE, shortSubregion, typeFamily } from "./groups";
import { arrow, bearing, direction, haversine, km, type LatLng } from "./geo";

const STATE_WORD: Record<TileState, string> = { correct: "match", present: "close", absent: "no match" };

function tile(key: string, label: string, state: TileState, value: string, sub?: string, extra?: string): Tile {
  const a11y = `${label}: ${value}, ${STATE_WORD[state]}${extra ? ", " + extra : ""}`;
  return { key, label, state, value, sub, a11y };
}

export interface GeoLookup {
  countryByIso2(iso2: string): Country | undefined;
}

export function sharedIngredients(g: Item, a: Item): number {
  const set = new Set(a.ingredients.map((s) => s.toLowerCase()));
  let k = 0;
  for (const i of new Set(g.ingredients.map((s) => s.toLowerCase()))) if (set.has(i)) k++;
  return k;
}

function distanceSub(from: LatLng | undefined, to: LatLng | undefined): { sub?: string; extra?: string } {
  if (!from || !to) return {};
  const d = haversine(from, to);
  const b = bearing(from, to);
  return { sub: `${arrow(b)} ${km(d)}`, extra: `${Math.round(d)} kilometres ${direction(b)}` };
}

/** Columns shown above the board, per mode and edition. */
export function columnsFor(mode: "dish" | "drink" | "cuisine", edition: Edition) {
  if (mode === "cuisine") {
    return edition === "global"
      ? [
          { key: "continent", label: "Continent" },
          { key: "subregion", label: "Subregion" },
          { key: "distance", label: "Distance" },
          { key: "neighbour", label: "Neighbour" },
        ]
      : [
          { key: "zone", label: "Zone" },
          { key: "distance", label: "Distance" },
        ];
  }
  const place =
    edition === "global"
      ? [
          { key: "country", label: "Country" },
          { key: "region", label: "Region" },
        ]
      : [
          { key: "zone", label: "Zone" },
          { key: "state", label: "State" },
        ];
  const kind =
    mode === "dish"
      ? [
          { key: "course", label: "Course" },
          { key: "diet", label: "Diet" },
        ]
      : [
          { key: "type", label: "Type" },
          { key: "alcohol", label: "Alcohol" },
        ];
  return [...place, ...kind, { key: "shared", label: "Shared" }];
}

/** Spec 13.7: tiles for a dish or drink guess G against answer A. */
export function itemFeedback(G: Item, A: Item, edition: Edition, geo: GeoLookup): Tile[] {
  const tiles: Tile[] = [];
  if (edition === "global") {
    const same = G.country === A.country;
    const state: TileState = same ? "correct" : G.continent === A.continent ? "present" : "absent";
    const dist = same ? {} : distanceSub(geo.countryByIso2(G.iso2), geo.countryByIso2(A.iso2));
    tiles.push(tile("country", "Country", state, G.country, dist.sub, dist.extra));
    tiles.push(
      tile("region", "Region", G.subregion && G.subregion === A.subregion ? "correct" : "absent", shortSubregion(G.subregion)),
    );
  } else {
    tiles.push(tile("zone", "Zone", G.zone && G.zone === A.zone ? "correct" : "absent", G.zone ?? "—"));
    tiles.push(tile("state", "State", G.state && G.state === A.state ? "correct" : "absent", abbreviateState(G.state)));
  }

  if (A.kind === "dish") {
    const course: TileState =
      G.course === A.course ? "correct" : G.course && courseFamily(G.course) === courseFamily(A.course) ? "present" : "absent";
    tiles.push(tile("course", "Course", course, G.course ?? "—"));
    const diet: TileState =
      G.diet === A.diet ? "correct" : G.diet && A.diet && MEAT_FREE.has(G.diet) && MEAT_FREE.has(A.diet) ? "present" : "absent";
    tiles.push(tile("diet", "Diet", diet, G.diet ?? "—"));
  } else {
    const type: TileState =
      G.type === A.type ? "correct" : G.type && typeFamily(G.type) === typeFamily(A.type) ? "present" : "absent";
    tiles.push(tile("type", "Type", type, G.type ?? "—"));
    tiles.push(
      tile("alcohol", "Alcohol", G.alcoholic === A.alcoholic ? "correct" : "absent", G.alcoholic ? "Alcoholic" : "Zero-proof"),
    );
  }

  const k = sharedIngredients(G, A);
  const n = A.ingredients.length;
  tiles.push(
    tile("shared", "Shared", G.id === A.id ? "correct" : k > 0 ? "present" : "absent", `${k} / ${n}`, "shared", `${k} of ${n} ingredients shared`),
  );
  return tiles;
}

/** Cuisine Global: the player guesses a country. */
export function countryFeedback(G: Country, A: Country): Tile[] {
  const same = G.iso2 === A.iso2;
  const d = haversine(G, A);
  const b = bearing(G, A);
  const distState: TileState = same || d < 1 ? "correct" : d <= 1500 ? "present" : "absent";
  const neighbour: TileState = same ? "correct" : G.borders.includes(A.iso3) || A.borders.includes(G.iso3) ? "present" : "absent";
  return [
    tile("continent", "Continent", G.region === A.region ? "correct" : "absent", G.region),
    tile("subregion", "Subregion", G.subregion === A.subregion ? "correct" : "absent", shortSubregion(G.subregion)),
    same
      ? tile("distance", "Distance", "correct", "0 km")
      : tile("distance", "Distance", distState, `${arrow(b)} ${km(d)}`, undefined, `${direction(b)}`),
    tile("neighbour", "Neighbour", neighbour, same ? "Same" : neighbour === "present" ? "Borders" : "No"),
  ];
}

/**
 * India spans ~3,000 km, so the global 1,500 km "close" band would make almost every
 * state yellow. The India edition uses a tighter band.
 */
export const INDIA_NEAR_KM = 500;

/** Cuisine India: the player guesses a state. */
export function stateFeedback(G: IndiaState, A: IndiaState): Tile[] {
  const same = G.name === A.name;
  const zone = tile("zone", "Zone", G.zone === A.zone ? "correct" : "absent", G.zone);
  if (same) return [zone, tile("distance", "Distance", "correct", "0 km")];
  if (G.lat == null || G.lng == null || A.lat == null || A.lng == null) {
    return [zone, tile("distance", "Distance", "absent", "—", undefined, "distance unknown")];
  }
  const d = haversine(G as LatLng, A as LatLng);
  const b = bearing(G as LatLng, A as LatLng);
  return [zone, tile("distance", "Distance", d <= INDIA_NEAR_KM ? "present" : "absent", `${arrow(b)} ${km(d)}`, undefined, direction(b))];
}
