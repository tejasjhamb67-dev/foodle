import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512, 1024]);

/** App icon (spec 3.5): a single green tile with an ink "F", no transparency. */
export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: s } = await params;
  const size = SIZES.has(Number(s)) ? Number(s) : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#6AAA64",
          color: "#1A1A1B",
          fontSize: size * (maskable ? 0.45 : 0.62),
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        F
      </div>
    ),
    { width: size, height: size },
  );
}
