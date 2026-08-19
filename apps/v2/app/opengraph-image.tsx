import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Grabbin — A Link in Bio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const [logoData, interRegular, interBold] = await Promise.all([
  readFile(join(process.cwd(), "public/logo512.png"), "base64"),
  readFile(join(process.cwd(), "public/fonts/Inter-Regular.ttf")),
  readFile(join(process.cwd(), "public/fonts/Inter-Bold.ttf")),
]);
const logoSrc = `data:image/png;base64,${logoData}`;

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#ffffff",
        color: "#171717",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
        <div
          style={{
            backgroundImage: `url(${logoSrc})`,
            backgroundSize: "contain",
            height: 44,
            width: 44,
          }}
        />
        <div style={{ fontSize: 34, fontWeight: 700 }}>Grabbin</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 60,
          fontWeight: 700,
        }}
      >
        <div>A cleaner, more beautiful</div>
        <div>Link in Bio</div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { data: interRegular, name: "Inter", weight: 400 },
        { data: interBold, name: "Inter", weight: 700 },
      ],
    },
  );
}
