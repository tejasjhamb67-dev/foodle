"use client";
import { EDITION_LABEL, MODE_LABEL, shareText, type Edition, type Mode, type TileState } from "@foodle/game";
import { SITE_URL } from "./config";

const COLORS = {
  light: { bg: "#FFFFFF", text: "#1A1A1B", muted: "#6E7174", correct: "#6AAA64", present: "#C9B458", absent: "#D3D6DA" },
  hc: { correct: "#F5793A", present: "#85C0F9" },
};

/** Spec 5.5: 1080 × 1350 share image. Rendered off-screen on a canvas. */
export async function renderShareCard(o: {
  number: number;
  edition: Edition;
  mode: Mode;
  rows: TileState[][];
  won: boolean;
  streak: number;
  highContrast: boolean;
}): Promise<Blob | null> {
  const W = 1080,
    H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  await document.fonts?.ready;
  const L = COLORS.light;
  const correct = o.highContrast ? COLORS.hc.correct : L.correct;
  const present = o.highContrast ? COLORS.hc.present : L.present;
  ctx.fillStyle = L.bg;
  ctx.fillRect(0, 0, W, H);
  const sans = getComputedStyle(document.body).fontFamily;
  const serif = getComputedStyle(document.documentElement).getPropertyValue("--font-lora") || "Georgia";

  // Wordmark
  const tile = 100,
    gap = 14;
  const wmColors = [correct, present, "#6E7174", correct, present, correct];
  const wmX = (W - (6 * tile + 5 * gap)) / 2;
  "FOODLE".split("").forEach((ch, i) => {
    const x = wmX + i * (tile + gap);
    ctx.fillStyle = wmColors[i];
    roundRect(ctx, x, 120, tile, tile, 8);
    ctx.fill();
    ctx.fillStyle = i === 2 ? "#FFFFFF" : L.text;
    ctx.font = `800 58px ${sans}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, x + tile / 2, 120 + tile / 2 + 3);
  });

  ctx.fillStyle = L.muted;
  ctx.font = `600 40px ${sans}`;
  ctx.fillText(`No. ${o.number} · ${EDITION_LABEL[o.edition]} edition`, W / 2, 310);
  ctx.fillStyle = L.text;
  ctx.font = `600 72px ${serif}, Georgia, serif`;
  ctx.fillText(o.won ? `Solved in ${o.rows.length} of 6` : "Back to the kitchen", W / 2, 410);

  // Tile grid
  const cols = o.rows[0]?.length ?? 5;
  const gw = 760;
  const tg = 16;
  const tw = (gw - (cols - 1) * tg) / cols;
  const th = 92;
  const gx = (W - gw) / 2;
  o.rows.forEach((r, ri) => {
    r.forEach((s, ci) => {
      ctx.fillStyle = s === "correct" ? correct : s === "present" ? present : L.absent;
      roundRect(ctx, gx + ci * (tw + tg), 500 + ri * (th + tg), tw, th, 8);
      ctx.fill();
    });
  });

  ctx.fillStyle = L.muted;
  ctx.font = `600 40px ${sans}`;
  const streak = o.streak > 0 ? ` · ${o.streak}-day streak` : "";
  ctx.fillText(`${MODE_LABEL[o.mode]}${streak}`, W / 2, H - 170);
  ctx.fillStyle = L.text;
  ctx.font = `700 44px ${sans}`;
  ctx.fillText(SITE_URL.replace(/^https?:\/\//, ""), W / 2, H - 100);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Web Share API where supported (with the image when files are allowed); else copy text. */
export async function share(o: Parameters<typeof renderShareCard>[0]): Promise<"native" | "image" | "clipboard" | "cancelled"> {
  const url = `${SITE_URL.replace(/^https?:\/\//, "")}/${o.number}`;
  const text = shareText({ ...o, url });
  if (navigator.share) {
    try {
      const blob = await renderShareCard(o);
      const file = blob ? new File([blob], `foodle-${o.number}.png`, { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ text, files: [file] });
        return "image";
      }
      await navigator.share({ text });
      return "native";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  await navigator.clipboard.writeText(text);
  return "clipboard";
}
