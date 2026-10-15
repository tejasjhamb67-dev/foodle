import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 112,
          fontWeight: 800,
        }}
      >
        F
      </div>
    ),
    size,
  );
}
