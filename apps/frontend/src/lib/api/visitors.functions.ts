import { env as cloudflareEnv } from "cloudflare:workers";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { env as viteEnv } from "@/env";
import { getPageByHandle } from "./pages.functions";

const SIMPLE_ANALYTICS_API_URL = "https://simpleanalytics.com";
const VISITORS_CACHE_TTL_MS = 900_000;

const publicVisitorsInputSchema = v.object({
	pageId: v.pipe(v.string(), v.uuid()),
	handle: v.pipe(v.string(), v.minLength(1)),
	timezone: v.string(),
});

const publicVisitorsResponseSchema = v.object({
	todayVisitors: v.nullable(v.number()),
	yesterdayVisitors: v.nullable(v.number()),
});

const simpleAnalyticsStatsResponseSchema = v.object({
	visitors: v.number(),
});

export type PublicVisitorsInput = v.InferOutput<
	typeof publicVisitorsInputSchema
>;
export type PublicVisitors = v.InferOutput<typeof publicVisitorsResponseSchema>;

type VisitorsMetric = "today" | "yesterday";

type CachedVisitors = {
	value: number | null;
	expiresAt: number;
};

type LocalDayRange = {
	timezone: string;
	localDate: string;
	yesterdayDate: string;
};

const visitorsCache = new Map<string, CachedVisitors>();

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
	metric: VisitorsMetric,
) {
	return `${pageId}:${timezone}:${localDate}:${metric}`;
}

async function fetchSimpleAnalyticsVisitors(
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
		url.searchParams.set("fields", "visitors");
		url.searchParams.set("start", localDate);
		url.searchParams.set("end", localDate);
		url.searchParams.set("timezone", timezone);
		url.searchParams.set("pages", `/__analytics/pages/${pageId}`);

		const response = await fetch(url, {
			headers: apiKey ? { "Api-Key": apiKey } : undefined,
		});

		if (!response.ok) return null;

		return v.parse(simpleAnalyticsStatsResponseSchema, await response.json())
			.visitors;
	} catch {
		return null;
	}
}

async function getCachedVisitors(
	hostname: string,
	apiKey: string | undefined,
	pageId: string,
	timezone: string,
	localDate: string,
	metric: VisitorsMetric,
	queryDate: string,
) {
	const key = getCacheKey(pageId, timezone, localDate, metric);
	const now = Date.now();
	const cached = visitorsCache.get(key);

	if (cached) {
		if (cached.expiresAt > now) return cached.value;
		visitorsCache.delete(key);
	}

	const value = await fetchSimpleAnalyticsVisitors(
		hostname,
		apiKey,
		pageId,
		timezone,
		queryDate,
	);
	visitorsCache.set(key, {
		value,
		expiresAt: now + VISITORS_CACHE_TTL_MS,
	});

	return value;
}

export const getPublicVisitors = createServerFn({ method: "GET" })
	.validator((data: PublicVisitorsInput) =>
		v.parse(publicVisitorsInputSchema, data),
	)
	.handler(async ({ data }): Promise<PublicVisitors> => {
		const emptyResult = {
			todayVisitors: null,
			yesterdayVisitors: null,
		};
		let pageByHandle: Awaited<ReturnType<typeof getPageByHandle>>;
		try {
			pageByHandle = await getPageByHandle({
				data: { handle: data.handle },
			});
		} catch {
			return emptyResult;
		}

		if (
			!pageByHandle ||
			pageByHandle.page.id !== data.pageId ||
			pageByHandle.visitorsEnabled !== true
		)
			return emptyResult;

		const apiKey = cloudflareEnv.SIMPLE_ANALYTICS_API_KEY;
		const hostname = viteEnv.VITE_APP_DOMAIN;

		const range = getLocalDayRange(data.timezone, new Date());
		const [todayVisitors, yesterdayVisitors] = await Promise.all([
			getCachedVisitors(
				hostname,
				apiKey,
				data.pageId,
				range.timezone,
				range.localDate,
				"today",
				range.localDate,
			),
			getCachedVisitors(
				hostname,
				apiKey,
				data.pageId,
				range.timezone,
				range.localDate,
				"yesterday",
				range.yesterdayDate,
			),
		]);

		return v.parse(publicVisitorsResponseSchema, {
			todayVisitors,
			yesterdayVisitors,
		});
	});

export function getPublicVisitorsQueryOptions(
	pageId: string,
	handle: string,
	timezone: string,
) {
	return queryOptions({
		queryKey: ["public-visitors", pageId, handle, timezone] as const,
		queryFn: () =>
			getPublicVisitors({
				data: {
					pageId,
					handle,
					timezone,
				},
			}),
		staleTime: VISITORS_CACHE_TTL_MS,
	});
}
