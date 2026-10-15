/**
 * Image sourcing, steps 1–2 of the pipeline in design system §9.3.
 * For each dish and drink: find the English Wikipedia article's lead image, read its Commons
 * licence, and keep it only when the licence is accepted (PD, CC0, CC BY, CC BY-SA) and the long
 * edge is ≥ 2,400 px. Results go to data/images.json for a human reviewer (step 3);
 * re-run `pnpm content:import` afterwards to attach them to items.
 *
 * Usage: pnpm content:images [--limit 50] [--ids D0001,D0002]
 * Wikimedia asks for a descriptive User-Agent: set FOODLE_UA="Foodle/1.0 (you@example.com)".
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Item, ItemImage } from "@foodle/game";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "../data");
const items = JSON.parse(readFileSync(join(dataDir, "items.json"), "utf8")) as Item[];
const outPath = join(dataDir, "images.json");
const out: Record<string, ItemImage & { status: "candidate" | "approved" }> = existsSync(outPath)
  ? JSON.parse(readFileSync(outPath, "utf8"))
  : {};

const args = process.argv.slice(2);
const limit = Number(args[args.indexOf("--limit") + 1]) || Infinity;
const onlyIds = args.includes("--ids") ? new Set(args[args.indexOf("--ids") + 1].split(",")) : null;
const UA = process.env.FOODLE_UA ?? "FoodleImageSourcing/1.0 (https://github.com/tejasjhamb67-dev/foodle)";
const MIN_EDGE = 2400;
const ACCEPTED = /^(public domain|pd|cc0|cc by(-sa)? ?\d(\.\d)?)/i;
const WATERMARK = /watermark|logo|menu|advert/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function get(url: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
    if (res.status === 429) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }
  throw new Error(`rate limited: ${url}`);
}

const strip = (html = "") => html.replace(/<[^>]+>/g, "").trim();

async function leadImage(title: string): Promise<string | null> {
  const q = new URLSearchParams({ action: "query", format: "json", redirects: "1", prop: "pageimages", piprop: "name", titles: title });
  const r = await get(`https://en.wikipedia.org/w/api.php?${q}`);
  const page = Object.values(r.query?.pages ?? {})[0] as { pageimage?: string } | undefined;
  return page?.pageimage ?? null;
}

async function commonsInfo(file: string) {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "1280",
    titles: `File:${file}`,
  });
  const r = await get(`https://commons.wikimedia.org/w/api.php?${q}`);
  const page = Object.values(r.query?.pages ?? {})[0] as any;
  return page?.imageinfo?.[0];
}

let done = 0;
for (const it of items) {
  if (done >= limit) break;
  if (onlyIds && !onlyIds.has(it.id)) continue;
  if (out[it.id]?.status === "approved") continue;
  done++;
  try {
    let file: string | null = null;
    for (const t of [it.name, ...it.aliases]) {
      file = await leadImage(t);
      if (file) break;
    }
    if (!file) {
      console.log(`${it.id} ${it.name}: no lead image`);
      continue;
    }
    const info = await commonsInfo(file);
    const meta = info?.extmetadata ?? {};
    const licence = strip(meta.LicenseShortName?.value);
    const desc = strip(meta.ImageDescription?.value);
    const edge = Math.max(info?.width ?? 0, info?.height ?? 0);
    const reasons = [
      !ACCEPTED.test(licence) && `licence "${licence}"`,
      edge < MIN_EDGE && `long edge ${edge}px`,
      WATERMARK.test(file + " " + desc) && "watermark keywords",
    ].filter(Boolean);
    if (reasons.length) {
      console.log(`${it.id} ${it.name}: rejected (${reasons.join(", ")})`);
      continue;
    }
    out[it.id] = {
      // 1280 px rendition for the answer card (§13.9); the original stays on Commons.
      url: (info.thumburl ?? info.url).split("?")[0],
      w: info.thumbwidth ?? info.width,
      h: info.thumbheight ?? info.height,
      licence,
      author: strip(meta.Artist?.value) || "Unknown",
      sourceUrl: info.descriptionurl,
      status: "candidate",
    };
    console.log(`${it.id} ${it.name}: ${licence} ${info.width}×${info.height}`);
  } catch (e) {
    console.warn(`${it.id} ${it.name}: ${(e as Error).message}`);
  }
  await sleep(250);
  if (done % 20 === 0) writeFileSync(outPath, JSON.stringify(out, null, 1));
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`Saved ${Object.keys(out).length} images to ${outPath}. Set "status": "approved" after review, then run pnpm content:import.`);
