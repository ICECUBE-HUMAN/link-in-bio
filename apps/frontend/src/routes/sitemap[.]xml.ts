import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const origin = getSiteUrl() ?? new URL(request.url).origin;
				const entries: SitemapEntry[] = [
					{
						loc: toAbsoluteUrl("/", origin),
						changefreq: "weekly",
						priority: 1,
					},
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
