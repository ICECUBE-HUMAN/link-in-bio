import { env as cloudflareEnv } from "cloudflare:workers";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { env as viteEnv } from "@/env";
import { getPageByHandle } from "./pages.functions";

const SIMPLE_ANALYTICS_API_URL = "https://simpleanalytics.com";
const VIEWS_CACHE_TTL_MS = 900_000;

const publicViewsInputSchema = v.object({
	pageId: v.pipe(v.string(), v.uuid()),
	handle: v.pipe(v.string(), v.minLength(1)),
	timezone: v.string(),
});

const publicViewsResponseSchema = v.object({
	todayViews: v.nullable(v.number()),
	yesterdayViews: v.nullable(v.number()),
});

const simpleAnalyticsStatsResponseSchema = v.object({
	pageviews: v.number(),
});

type PublicViews = v.InferOutput<typeof publicViewsResponseSchema>;

type CachedPageviews = {
	value: number | null;
	expiresAt: number;
};

type LocalDayRange = {
	timezone: string;
	localDate: string;
	yesterdayDate: string;
};

const viewsCache = new Map<string, CachedPageviews>();
const emptyViews: PublicViews = {
	todayViews: null,
	yesterdayViews: null,
};

function getDateTimeParts(date: Date, timezone: string) {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});

	return Object.fromEntries(
		formatter
			.formatToParts(date)
			.filter(({ type }) => type !== "literal")
			.map(({ type, value }) => [type, Number(value)]),
	) as {
		year: number;
		month: number;
		day: number;
		hour: number;
		minute: number;
		second: number;
	};
}

function getLocalDayRange(timezone: string, now: Date): LocalDayRange {
	let effectiveTimezone = timezone;

	try {
		new Intl.DateTimeFormat("en-US", { timeZone: effectiveTimezone });
	} catch {
		effectiveTimezone = "UTC";
	}

	const localDateParts = getDateTimeParts(now, effectiveTimezone);
	const yesterdayDate = new Date(
		Date.UTC(
			localDateParts.year,
			localDateParts.month - 1,
			localDateParts.day - 1,
		),
	);

	return {
		timezone: effectiveTimezone,
		localDate: `${localDateParts.year}-${String(localDateParts.month).padStart(2, "0")}-${String(localDateParts.day).padStart(2, "0")}`,
		yesterdayDate: `${yesterdayDate.getUTCFullYear()}-${String(yesterdayDate.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getUTCDate()).padStart(2, "0")}`,
	};
}

function getCacheKey(
	pageId: string,
	timezone: string,
	localDate: string,
	queryDate: string,
) {
	return `${pageId}:${timezone}:${localDate}:${queryDate}`;
}

async function fetchSimpleAnalyticsPageviews(
	hostname: string,
	apiKey: string | undefined,
	pageId: string,
	timezone: string,
	localDate: string,
) {
	try {
		const url = new URL(
			`${SIMPLE_ANALYTICS_API_URL}/${encodeURIComponent(hostname)}.json`,
		);
		url.searchParams.set("version", "6");
		url.searchParams.set("fields", "pageviews");
		url.searchParams.set("start", localDate);
		url.searchParams.set("end", localDate);
		url.searchParams.set("timezone", timezone);
		url.searchParams.set("pages", `/__analytics/pages/${pageId}`);

		const response = await fetch(url, {
			headers: apiKey ? { "Api-Key": apiKey } : undefined,
		});

		if (!response.ok) return null;

		return v.parse(simpleAnalyticsStatsResponseSchema, await response.json())
			.pageviews;
	} catch {
		return null;
	}
}

async function getCachedPageviews(
	hostname: string,
	apiKey: string | undefined,
	pageId: string,
	timezone: string,
	localDate: string,
	queryDate: string,
) {
	const key = getCacheKey(pageId, timezone, localDate, queryDate);
	const now = Date.now();
	const cached = viewsCache.get(key);

	if (cached) {
		if (cached.expiresAt > now) return cached.value;
		viewsCache.delete(key);
	}

	const value = await fetchSimpleAnalyticsPageviews(
		hostname,
		apiKey,
		pageId,
		timezone,
		queryDate,
	);
	viewsCache.set(key, {
		value,
		expiresAt: now + VIEWS_CACHE_TTL_MS,
	});

	return value;
}

export const getPublicViews = createServerFn({ method: "GET" })
	.validator((data) => v.parse(publicViewsInputSchema, data))
	.handler(async ({ data }) => {
		try {
			const pageByHandle = await getPageByHandle({
				data: { handle: data.handle },
			});
			if (
				pageByHandle?.page.id !== data.pageId ||
				pageByHandle.visitorsEnabled !== true
			)
				return emptyViews;
		} catch {
			return emptyViews;
		}

		const apiKey = cloudflareEnv.SIMPLE_ANALYTICS_API_KEY;
		const hostname = viteEnv.VITE_APP_DOMAIN;

		const range = getLocalDayRange(data.timezone, new Date());
		const [todayViews, yesterdayViews] = await Promise.all([
			getCachedPageviews(
				hostname,
				apiKey,
				data.pageId,
				range.timezone,
				range.localDate,
				range.localDate,
			),
			getCachedPageviews(
				hostname,
				apiKey,
				data.pageId,
				range.timezone,
				range.localDate,
				range.yesterdayDate,
			),
		]);

		return v.parse(publicViewsResponseSchema, {
			todayViews,
			yesterdayViews,
		});
	});

export function getPublicViewsQueryOptions(
	pageId: string,
	handle: string,
	timezone: string,
) {
	return queryOptions({
		queryKey: ["public-views", pageId, handle, timezone] as const,
		queryFn: () =>
			getPublicViews({
				data: {
					pageId,
					handle,
					timezone,
				},
			}),
		staleTime: VIEWS_CACHE_TTL_MS,
	});
}
