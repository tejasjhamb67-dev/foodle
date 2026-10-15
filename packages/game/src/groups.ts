export const ZONES: Record<string, string[]> = {
  North: ["Delhi", "Punjab", "Himachal Pradesh", "Jammu & Kashmir", "Uttarakhand", "Uttar Pradesh"],
  West: ["Rajasthan", "Gujarat", "Maharashtra", "Goa"],
  South: ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"],
  East: ["West Bengal", "Odisha", "Bihar"],
  Northeast: ["Assam", "Sikkim", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura", "Arunachal Pradesh"],
  Central: ["Madhya Pradesh", "Chhattisgarh"],
  "Pan-India": ["Pan-India"],
};

const zoneOf: Record<string, string> = {};
for (const [zone, states] of Object.entries(ZONES)) for (const s of states) zoneOf[s] = zone;

export function zoneForState(state: string | undefined): string | undefined {
  return state ? zoneOf[state] : undefined;
}

export const COURSE_FAMILIES: Record<string, string[]> = {
  Mains: ["Main", "Rice", "Soup"],
  "Light bites": ["Snack", "Street", "Breakfast", "Side", "Salad"],
  Sweets: ["Dessert", "Sweet"],
  "Breads & condiments": ["Bread", "Condiment"],
};

export const TYPE_FAMILIES: Record<string, string[]> = {
  Mixed: ["Cocktail", "Mocktail"],
  Spirits: ["Spirit", "Liqueur"],
  Brewed: ["Beer", "Wine", "Fermented"],
  Hot: ["Hot"],
  Cold: ["Cold"],
};

function familyLookup(families: Record<string, string[]>) {
  const out: Record<string, string> = {};
  for (const [fam, members] of Object.entries(families)) for (const m of members) out[m] = fam;
  return (v: string | undefined) => (v ? out[v] : undefined);
}

export const courseFamily = familyLookup(COURSE_FAMILIES);
export const typeFamily = familyLookup(TYPE_FAMILIES);

export const MEAT_FREE = new Set(["Veg", "Vegan", "Egg"]);

const SUBREGION_SHORT: Record<string, string> = {
  "South-Eastern Asia": "SE Asia",
  "Southern Asia": "S Asia",
  "Eastern Asia": "E Asia",
  "Western Asia": "W Asia",
  "Central Asia": "C Asia",
  "Northern Europe": "N Europe",
  "Southern Europe": "S Europe",
  "Western Europe": "W Europe",
  "Eastern Europe": "E Europe",
  "Central Europe": "C Europe",
  "Southeast Europe": "SE Europe",
  "Northern Africa": "N Africa",
  "Western Africa": "W Africa",
  "Eastern Africa": "E Africa",
  "Southern Africa": "S Africa",
  "Middle Africa": "C Africa",
  "North America": "N America",
  "South America": "S America",
  "Central America": "C America",
  "Australia and New Zealand": "Aus & NZ",
};

export function shortSubregion(s: string | undefined): string {
  if (!s) return "—";
  return SUBREGION_SHORT[s] ?? s;
}

const STATE_SHORT: Record<string, string> = {
  "Andhra Pradesh": "Andhra",
  "Arunachal Pradesh": "Arunachal",
  "Himachal Pradesh": "Himachal",
  "Jammu & Kashmir": "J & K",
  "Madhya Pradesh": "MP",
  "Uttar Pradesh": "UP",
  "West Bengal": "W Bengal",
  Chhattisgarh: "Chhattisg.",
  Uttarakhand: "Uttarakh.",
  Maharashtra: "Maharasht.",
};

/** State name, abbreviated when over 10 characters (spec 2.4). */
export function abbreviateState(s: string | undefined): string {
  if (!s) return "—";
  if (s.length <= 10) return s;
  return STATE_SHORT[s] ?? s.slice(0, 9) + ".";
}
