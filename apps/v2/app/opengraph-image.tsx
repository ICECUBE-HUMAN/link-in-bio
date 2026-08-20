import { ImageResponse } from "next/og";
import { env } from "@/lib/env";

export const alt = "Grabbin — A Link in Bio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

function toDataUrl(data: ArrayBuffer, contentType: string) {
  const bytes = new Uint8Array(data);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

async function getAsset(path: string) {
  const assets = env.ASSETS;
  if (!assets) {
    throw new Error("OG image assets binding is unavailable.");
  }

  const response = await assets.fetch(`https://assets.local${path}`);
  if (!response.ok) {
    throw new Error(`OG image asset unavailable: ${path}`);
  }

  return response.arrayBuffer();
}

export default async function Image() {
  const [logoBytes, regularFont, boldFont] = await Promise.all([
    getAsset("/logo512.png"),
    getAsset("/fonts/Inter-Regular.ttf"),
    getAsset("/fonts/Inter-Bold.ttf"),
  ]);
  const logoData = toDataUrl(logoBytes, "image/png");

  return new ImageResponse(
    <div
      style={{
        background: "#ffffff",
        color: "#171717",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders images on the server. */}
      <img
        src={logoData}
        alt="Grabbin"
        width={44}
        height={44}
        style={{ left: 72, position: "absolute", top: 64 }}
      />
      <span
        style={{
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 34,
          fontWeight: 700,
          left: 126,
          lineHeight: "44px",
          position: "absolute",
          top: 64,
        }}
      >
        Grabbin
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 60,
          fontWeight: 700,
          left: 72,
          lineHeight: "62px",
          position: "absolute",
          top: 446,
        }}
      >
        <span>A cleaner, more beautiful</span>
        <span>Link in Bio</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          data: regularFont,
          name: "Inter",
          style: "normal",
          weight: 400,
        },
        {
          data: boldFont,
          name: "Inter",
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
