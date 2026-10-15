import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Foodle — the daily food guessing game";

const TILES: [string, string, string][] = [
  ["F", "#6AAA64", "#1A1A1B"],
  ["O", "#C9B458", "#1A1A1B"],
  ["O", "#6E7174", "#FFFFFF"],
  ["D", "#6AAA64", "#1A1A1B"],
  ["L", "#C9B458", "#1A1A1B"],
  ["E", "#6AAA64", "#1A1A1B"],
];

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <div style={{ display: "flex", gap: 18 }}>
          {TILES.map(([l, bg, fg], i) => (
            <div key={i} style={{ width: 130, height: 130, borderRadius: 8, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 76, fontWeight: 800 }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, fontSize: 44, color: "#1A1A1B", fontWeight: 600 }}>The daily food guessing game</div>
        <div style={{ marginTop: 12, fontSize: 30, color: "#6E7174" }}>Guess the dish in six tries. Every miss reveals an ingredient.</div>
      </div>
    ),
    size,
  );
}
