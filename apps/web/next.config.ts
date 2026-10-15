import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const config: NextConfig = {
  transpilePackages: ["@foodle/game", "@foodle/tokens", "@foodle/content"],
  outputFileTracingRoot: root,
  turbopack: { root },
  images: { remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org" }, { protocol: "https", hostname: "thumb.wikimedia.org" }] },
  poweredByHeader: false,
};

export default config;
