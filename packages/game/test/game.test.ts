import { describe, expect, it } from "vitest";
import items from "../../content/data/items.json";
import countries from "../../content/data/countries.json";
import states from "../../content/data/states.json";
import {
  bearing,
  buildSchedule,
  computeStats,
  countryFeedback,
  exactMatch,
  haversine,
  indexOptions,
  itemFeedback,
  puzzleNumber,
  search,
  shareText,
  stateFeedback,
  type Country,
  type IndiaState,
  type Item,
} from "../src";

const all = items as Item[];
const byName = (n: string) => all.find((i) => i.name === n)!;
const C = countries as Country[];
const geo = { countryByIso2: (iso: string) => C.find((c) => c.iso2 === iso) };
const country = (n: string) => C.find((c) => c.name === n)!;

describe("feedback (spec worked examples)", () => {
  it("Pho vs Pad Thai: ← 849 km, region green, course yellow", () => {
    const t = itemFeedback(byName("Pho"), byName("Pad Thai"), "global", geo);
    expect(t[0]).toMatchObject({ key: "country", state: "present", value: "Vietnam", sub: "← 849 km" });
    expect(t[1]).toMatchObject({ key: "region", state: "correct", value: "SE Asia" });
    expect(t[2]).toMatchObject({ key: "course", state: "present" });
    const b = bearing(country("Vietnam"), country("Thailand"));
    expect(Math.round(b)).toBe(262);
  });

  it("Paneer Butter Masala vs Butter Chicken: 4 shared, diet mismatch", () => {
    const t = itemFeedback(byName("Paneer Butter Masala"), byName("Butter Chicken"), "india", geo);
    expect(t.map((x) => x.state)).toEqual(["correct", "correct", "correct", "absent", "present"]);
    expect(t[4].value).toBe("4 / 7");
  });

  it("Chicken Tikka Masala vs Butter Chicken (India): North zone, 3 of 7", () => {
    const t = itemFeedback(byName("Chicken Tikka Masala"), byName("Butter Chicken"), "india", geo);
    expect(t[0]).toMatchObject({ value: "North", state: "correct" });
    expect(t[1].state).toBe("absent");
    expect(t[4].value).toBe("3 / 7");
  });

  it("correct guess is all green", () => {
    const a = byName("Butter Chicken");
    expect(itemFeedback(a, a, "global", geo).every((t) => t.state === "correct")).toBe(true);
  });

  it("drinks use type families and alcohol", () => {
    const t = itemFeedback(byName("Mojito"), byName("Margarita"), "global", geo);
    expect(t[2]).toMatchObject({ key: "type", state: "correct" });
    expect(t[3]).toMatchObject({ key: "alcohol", state: "correct", value: "Alcoholic" });
  });

  it("cuisine global: borders and distance", () => {
    const t = countryFeedback(country("France"), country("Spain"));
    expect(t.find((x) => x.key === "neighbour")).toMatchObject({ state: "present", value: "Borders" });
    expect(t.find((x) => x.key === "distance")!.state).toBe("present");
    expect(countryFeedback(country("Japan"), country("Japan")).every((x) => x.state === "correct")).toBe(true);
  });

  it("cuisine india: zone + distance", () => {
    const S = states as IndiaState[];
    const st = (n: string) => S.find((s) => s.name === n)!;
    const t = stateFeedback(st("Punjab"), st("Delhi"));
    expect(t[0].state).toBe("correct");
    expect(t[1].state).toBe("present");
  });
});

describe("puzzle and schedule", () => {
  it("numbers from launch day", () => {
    expect(puzzleNumber("2026-10-01", "2026-10-01")).toBe(1);
    expect(puzzleNumber("2026-10-15", "2026-10-01")).toBe(15);
  });

  it("schedule is deterministic and never repeats a group on consecutive days", () => {
    const pool = all
      .filter((i) => i.kind === "dish" && i.puzzleReady && i.modes.global)
      .map((i) => ({ id: i.id, fame: i.fame, group: i.country }));
    const a = buildSchedule(pool, 400, "2026-10-01", "s");
    expect(buildSchedule(pool, 400, "2026-10-01", "s")).toEqual(a);
    const group = new Map(pool.map((p) => [p.id, p.group]));
    for (let i = 1; i < a.length; i++) expect(group.get(a[i])).not.toBe(group.get(a[i - 1]));
    // Fame 1 pool has no repeats within its first cycle
    expect(new Set(a.slice(0, 60)).size).toBe(60);
  });
});

describe("search", () => {
  const idx = indexOptions(all.map((i) => ({ id: i.id, name: i.name, aliases: i.aliases, meta: "" })));
  it("prefix ranks above infix and ignores accents", () => {
    expect(search(idx, "butter")[0].name.toLowerCase().startsWith("butter")).toBe(true);
    expect(search(idx, "pina colada")[0].name).toBe("Piña Colada");
    expect(exactMatch(idx, "murgh makhani")?.name).toBe("Butter Chicken");
  });
});

describe("stats and share", () => {
  it("streaks", () => {
    const s = computeStats(
      [
        { number: 1, won: true, guesses: 3 },
        { number: 2, won: true, guesses: 2 },
        { number: 3, won: false, guesses: 6 },
        { number: 4, won: true, guesses: 1 },
        { number: 5, won: true, guesses: 4 },
      ],
      6,
    );
    expect(s).toMatchObject({ played: 5, winPct: 80, currentStreak: 2, maxStreak: 2 });
    expect(s.distribution).toEqual([1, 1, 1, 1, 0, 0, 1]);
  });
  it("share text", () => {
    const t = shareText({ number: 142, edition: "india", mode: "dish", rows: [["correct", "absent"]], won: true, url: "foodle.app/142" });
    expect(t).toBe("Foodle No. 142 · India · Dish 1/6\n\n🟩⬜\n\nfoodle.app/142");
  });
  it("share text marks a result that used options", () => {
    const t = shareText({ number: 3, edition: "global", mode: "drink", rows: [["absent"], ["correct"]], won: true, assisted: true, url: "x" });
    expect(t.split("\n")[0]).toBe("Foodle No. 3 · Global · Drink 2/6 · with options");
  });
  it("haversine sanity", () => {
    expect(Math.round(haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }))).toBe(111);
  });
});
