import {
  type CreatePageRequest,
  type CreatePageResponse,
  createPageResponseSchema,
  type HandleAvailabilityResponse,
  handleAvailabilityResponseSchema,
} from "@grabbin/api";
import * as v from "valibot";

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Page request failed with status ${response.status}.`);
  }

  return response.json();
}

export async function checkPageHandle(
  handle: string,
): Promise<HandleAvailabilityResponse> {
  const params = new URLSearchParams({ handle });
  return v.parse(
    handleAvailabilityResponseSchema,
    await requestJson(`/api/pages/check?${params.toString()}`),
  );
}

export async function createPage(
  input: CreatePageRequest,
): Promise<CreatePageResponse> {
  return v.parse(
    createPageResponseSchema,
    await requestJson("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}
