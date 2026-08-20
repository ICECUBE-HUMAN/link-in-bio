import { env } from "@/lib/env";
import { getPublicImageUrl } from "@/lib/seo-responses";

export const size = { width: 64, height: 64 };
export const contentType = "image/svg+xml";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function fallbackIcon() {
  return new Response(null, {
    status: 307,
    headers: { location: "/icon.svg" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getPageImageUrl(handle: string) {
  let response: Response;
  try {
    const url = new URL(
      `/pages/${encodeURIComponent(handle.trim().toLowerCase())}`,
      env.NEXT_PUBLIC_API_BASE_URL,
    );
    response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }

  if (!isRecord(payload) || !isRecord(payload.page)) return null;
  const image = payload.page.image;
  const updatedAt = payload.page.updatedAt;
  if (typeof image !== "string" || typeof updatedAt !== "string") return null;

  return getPublicImageUrl(image, updatedAt);
}

function isAllowedImageUrl(imageUrl: URL) {
  const publicBaseUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!publicBaseUrl) return false;

  try {
    return imageUrl.origin === new URL(publicBaseUrl).origin;
  } catch {
    return false;
  }
}

function escapeXml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

export default async function Icon({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const imageUrlString = await getPageImageUrl((await params).handle);
  if (!imageUrlString) return fallbackIcon();

  let imageUrl: URL;
  try {
    imageUrl = new URL(imageUrlString);
  } catch {
    return fallbackIcon();
  }

  if (
    (imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") ||
    !isAllowedImageUrl(imageUrl)
  ) {
    return fallbackIcon();
  }

  let imageResponse: Response;
  try {
    imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    return fallbackIcon();
  }
  if (!imageResponse.ok) return fallbackIcon();

  const contentLength = Number.parseInt(
    imageResponse.headers.get("content-length") ?? "",
    10,
  );
  if (
    Number.isSafeInteger(contentLength) &&
    (contentLength < 1 || contentLength > MAX_IMAGE_BYTES)
  ) {
    return fallbackIcon();
  }

  const contentType = imageResponse.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim();
  if (!contentType?.startsWith("image/")) return fallbackIcon();

  const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (imageBytes.byteLength > MAX_IMAGE_BYTES) return fallbackIcon();

  const imageData = `data:${contentType};base64,${toBase64(imageBytes)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><clipPath id="circle"><circle cx="32" cy="32" r="32" /></clipPath></defs>
<image href="${escapeXml(imageData)}" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#circle)" />
</svg>`;

  return new Response(svg, {
    headers: {
      "cache-control": "public, max-age=3600",
      "content-type": "image/svg+xml",
    },
  });
}
