import {
	type CreatePageRequest,
	createPageRequestSchema,
	createPageResponseSchema,
	handleAvailabilityResponseSchema,
	myPageResponseSchema,
} from "@sinabro/api";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import * as v from "valibot";
import { fetchBackend } from "./backend-client.server";

function createCookieHeaders() {
	const headers = new Headers();
	const cookie = getRequestHeader("cookie");

	if (cookie) {
		headers.set("cookie", cookie);
	}

	return headers;
}

export const checkPageHandleAvailability = createServerFn({
	method: "GET",
})
	.validator((data: { handle: string }) => data)
	.handler(async ({ data }) => {
		const params = new URLSearchParams({
			handle: data.handle,
		});
		const response = await fetchBackend(`/pages/check?${params}`, {
			method: "GET",
			headers: createCookieHeaders(),
		});

		if (!response.ok) {
			throw new Error(
				`Handle availability request failed with status ${response.status}.`,
			);
		}

		return v.parse(handleAvailabilityResponseSchema, await response.json());
	});

export const createPage = createServerFn({ method: "POST" })
	.validator((data: CreatePageRequest) =>
		v.parse(createPageRequestSchema, data),
	)
	.handler(async ({ data }) => {
		const headers = createCookieHeaders();
		headers.set("content-type", "application/json");

		const response = await fetchBackend("/pages", {
			method: "POST",
			headers,
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(`Page creation failed with status ${response.status}.`);
		}

		return v.parse(createPageResponseSchema, await response.json());
	});

export const getMyPage = createServerFn({ method: "GET" }).handler(async () => {
	const response = await fetchBackend("/pages/me", {
		method: "GET",
		headers: createCookieHeaders(),
	});

	if (response.status === 401) {
		return v.parse(myPageResponseSchema, { page: null });
	}

	if (!response.ok) {
		throw new Error(`My page request failed with status ${response.status}.`);
	}

	return v.parse(myPageResponseSchema, await response.json());
});

export const MY_PAGE_QUERY_KEY = ["pages", "me"] as const;
