import { env } from "@/lib/env";

const FORWARDED_REQUEST_HEADERS = ["cookie", "origin", "content-type"];

function getBackendUrl(path: string) {
  return new URL(path, env.NEXT_PUBLIC_API_BASE_URL);
}

export function fetchBackend(path: string, init?: RequestInit) {
  return env.BACKEND.fetch(getBackendUrl(path), init);
}

export function getBackendRequestHeaders(request: Request) {
  const headers = new Headers();

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}
