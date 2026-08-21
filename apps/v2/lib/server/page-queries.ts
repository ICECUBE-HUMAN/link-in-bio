import {
  createPageRequestSchema,
  createPageResponseSchema,
  handleAvailabilityResponseSchema,
  myPageResponseSchema,
  normalizePageHandle,
  ownedPageListResponseSchema,
  pageByHandleResponseSchema,
  type SessionResponse,
  sessionResponseSchema,
} from "@grabbin/api";
import { headers } from "next/headers";
import { cache } from "react";
import * as v from "valibot";
import { type BackendResult, fetchBackend } from "@/lib/server/backend";

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

export async function getOwnedPages(request?: Request) {
  return fetchBackend(
    "/pages",
    readInit(await getReadHeaders(request)),
    ownedPageListResponseSchema,
  );
}

export const getPageByHandle = cache(async function getPageByHandle(
  handle: string,
  request?: Request,
) {
  return fetchBackend(
    `/pages/${encodeURIComponent(normalizePageHandle(handle))}`,
    readInit(await getReadHeaders(request)),
    pageByHandleResponseSchema,
  );
});

export async function checkPageHandle(handle: string, request?: Request) {
  const params = new URLSearchParams({ handle });
  return fetchBackend(
    `/pages/check?${params.toString()}`,
    readInit(await getReadHeaders(request)),
    handleAvailabilityResponseSchema,
  );
}

export async function createPage(input: unknown, request?: Request) {
  const parsed = v.parse(createPageRequestSchema, input);
  const requestHeaders = await getReadHeaders(request);
  requestHeaders.set("content-type", "application/json");

  return fetchBackend(
    "/pages",
    {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(parsed),
    },
    createPageResponseSchema,
  );
}
