import * as v from "valibot";
import { env } from "@/lib/env";

const FORWARDED_REQUEST_HEADERS = [
  "cookie",
  "origin",
  "content-type",
  "authorization",
];

function getBackendUrl(path: string) {
  return new URL(path, env.NEXT_PUBLIC_API_BASE_URL);
}

type BackendSuccess<T> = {
  ok: true;
  response: Response;
  data: T;
};

type BackendFailure = {
  ok: false;
  response: Response;
};

export type BackendResult<T> = BackendSuccess<T> | BackendFailure;

export async function fetchBackend<S extends v.GenericSchema>(
  path: string,
  init: RequestInit,
  responseSchema: S,
): Promise<BackendResult<v.InferOutput<S>>> {
  const backendInit =
    init?.body === null || init?.body === undefined
      ? init
      : { ...init, duplex: "half" as const };
  const response = await env.BACKEND.fetch(getBackendUrl(path), backendInit);

  const normalizedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  if (!normalizedResponse.ok) {
    return { ok: false, response: normalizedResponse };
  }

  return {
    ok: true,
    response: normalizedResponse,
    data: v.parse(responseSchema, await normalizedResponse.clone().json()),
  };
}

export function getBackendRequestHeaders(request: Request) {
  const headers = new Headers();

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}
