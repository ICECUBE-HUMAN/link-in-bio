import {
  myPageResponseSchema,
  normalizePageHandle,
  pageByHandleResponseSchema,
} from "@grabbin/api";
import { headers } from "next/headers";
import * as v from "valibot";
import { type BackendResult, fetchBackend } from "@/lib/server/backend";

const sessionUserSchema = v.object({
  id: v.string(),
  primaryPageId: v.optional(v.nullable(v.string())),
});

const sessionResponseSchema = v.nullable(
  v.object({
    session: v.unknown(),
    user: sessionUserSchema,
  }),
);

export type SessionResponse = v.InferOutput<typeof sessionResponseSchema>;

const FORWARDED_HEADERS = ["cookie", "origin"] as const;

async function getReadHeaders(request?: Request) {
  const source = request?.headers ?? (await headers());
  const forwarded = new Headers();

  for (const name of FORWARDED_HEADERS) {
    const value = source.get(name);
    if (value) forwarded.set(name, value);
  }

  return forwarded;
}

function readInit(headers: Headers): RequestInit {
  return {
    method: "GET",
    headers,
    cache: "no-store",
  };
}

export function createReadResponse(response: Response) {
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("cache-control", "private, no-store");

  const vary = responseHeaders.get("vary");
  const hasCookieVary = vary
    ?.split(",")
    .some((value) => value.trim().toLowerCase() === "cookie");
  if (!hasCookieVary) {
    responseHeaders.set("vary", vary ? `${vary}, Cookie` : "Cookie");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function getSession(
  request?: Request,
): Promise<BackendResult<SessionResponse>> {
  return fetchBackend(
    "/auth/get-session",
    readInit(await getReadHeaders(request)),
    sessionResponseSchema,
  );
}

export async function getMyPage(request?: Request) {
  return fetchBackend(
    "/pages/me",
    readInit(await getReadHeaders(request)),
    myPageResponseSchema,
  );
}

export async function getPageByHandle(handle: string, request?: Request) {
  return fetchBackend(
    `/pages/${encodeURIComponent(normalizePageHandle(handle))}`,
    readInit(await getReadHeaders(request)),
    pageByHandleResponseSchema,
  );
}
