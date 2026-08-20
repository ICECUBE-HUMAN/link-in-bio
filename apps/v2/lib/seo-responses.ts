import { env } from "@/lib/env";

export function getSiteOrigin() {
  return env.NEXT_PUBLIC_APP_URL?.trim() || "https://grabbin.me";
}

export function getPublicImageUrl(image: string | null, updatedAt: string) {
  if (!image) return null;
  if (/^data:image\//.test(image)) return image;

  const baseUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!baseUrl) return null;

  const url = `${baseUrl.replace(/\/+$/, "")}/${image
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  return `${url}?v=${encodeURIComponent(updatedAt)}`;
}
