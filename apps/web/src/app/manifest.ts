import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Foodle — the daily food guessing game",
    short_name: "Foodle",
    description: "Guess the dish, the drink or the cuisine in six tries.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6AAA64",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
