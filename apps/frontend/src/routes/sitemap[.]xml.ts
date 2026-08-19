import { pageHandleSchema } from "@grabbin/api";
import { createFileRoute } from "@tanstack/react-router";
import { allPosts } from "content-collections";
import * as v from "valibot";
import { fetchBackend } from "@/lib/api/backend-client.server";
import { getSiteUrl } from "@/lib/site/site-url";

type SitemapEntry = {
	loc: string;
	lastmod?: string;
	changefreq?: "daily" | "weekly" | "monthly";
	priority?: number;
};

function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function toAbsoluteUrl(path: string, origin: string) {
	return new URL(path, origin).toString();
}

function getLatestDate(items: Array<{ published: Date }>) {
	return items.reduce<Date | undefined>(
		(latest, item) =>
			!latest || item.published > latest ? item.published : latest,
		undefined,
	);
}

function renderEntry(entry: SitemapEntry) {
	return [
		"<url>",
		`<loc>${escapeXml(entry.loc)}</loc>`,
		...(entry.lastmod ? [`<lastmod>${entry.lastmod}</lastmod>`] : []),
		...(entry.changefreq
			? [`<changefreq>${entry.changefreq}</changefreq>`]
			: []),
		...(entry.priority !== undefined
			? [`<priority>${entry.priority.toFixed(1)}</priority>`]
			: []),
		"</url>",
	].join("");
}

async function getPublicPageHandles() {
	const response = await fetchBackend("/pages/_sitemap");
	if (!response.ok) {
		throw new Error(
			`Public page sitemap request failed with status ${response.status}.`,
		);
	}

	return v.parse(v.array(pageHandleSchema), await response.json());
}

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const origin = getSiteUrl() ?? new URL(request.url).origin;
				const latestPost = getLatestDate(allPosts);
				const publicPageHandles = await getPublicPageHandles();
				const entries: SitemapEntry[] = [
					{
						loc: toAbsoluteUrl("/", origin),
						changefreq: "weekly",
						priority: 1,
					},
					{
						loc: toAbsoluteUrl("/demo", origin),
						changefreq: "monthly",
						priority: 0.7,
					},
					{
						loc: toAbsoluteUrl("/log-in", origin),
						changefreq: "monthly",
						priority: 0.5,
					},
					{
						loc: toAbsoluteUrl("/privacy", origin),
						priority: 0.2,
					},
					{
						loc: toAbsoluteUrl("/terms", origin),
						priority: 0.2,
					},
					{
						loc: toAbsoluteUrl("/pricing", origin),
						changefreq: "monthly",
						priority: 0.7,
					},
					{
						loc: toAbsoluteUrl("/blog", origin),
						lastmod: latestPost?.toISOString().slice(0, 10),
						changefreq: "weekly",
						priority: 0.8,
					},
					...allPosts.map((post) => ({
						loc: toAbsoluteUrl(
							`/blog/${encodeURIComponent(post.slug)}`,
							origin,
						),
						lastmod: post.published.toISOString().slice(0, 10),
						changefreq: "monthly" as const,
						priority: 0.7,
					})),
					...publicPageHandles.map((handle) => ({
						loc: toAbsoluteUrl(`/${encodeURIComponent(handle)}`, origin),
						changefreq: "weekly" as const,
						priority: 0.6,
					})),
				];

				const sitemap =
					`<?xml version="1.0" encoding="UTF-8"?>` +
					`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
					entries.map(renderEntry).join("") +
					`</urlset>`;

				return new Response(sitemap, {
					headers: {
						"Content-Type": "application/xml; charset=utf-8",
						"Cache-Control": "public, max-age=0, s-maxage=3600",
					},
				});
			},
		},
	},
});
