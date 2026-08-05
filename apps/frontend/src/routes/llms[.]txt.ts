import { createFileRoute } from "@tanstack/react-router";
import { createLlmsText, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/site/site-url";

function toAbsoluteUrl(path: string, siteUrl?: string) {
	if (!siteUrl) {
		return path;
	}

	return new URL(path, siteUrl).toString();
}

export const Route = createFileRoute("/llms.txt")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const siteUrl = getSiteUrl() ?? new URL(request.url).origin;
				const body = createLlmsText({
					title: DEFAULT_SITE_NAME,
					description:
						"grabbin is a flexible link in bio service for presenting your identity, links, media, and favorite places in one personal page.",
					resources: [
						{
							name: "Home",
							url: toAbsoluteUrl("/", siteUrl),
							description:
								"Overview of the link in bio service and its main features.",
						},
						{
							name: "Explore",
							url: toAbsoluteUrl("/explore", siteUrl),
							description: "Discovery surface for pages created by users.",
						},
						{
							name: "Updates",
							url: toAbsoluteUrl("/update", siteUrl),
							description: "Product updates and insights.",
						},
					],
				});

				return new Response(body, {
					headers: {
						"Content-Type": "text/plain; charset=utf-8",
						"Cache-Control": "public, max-age=0, s-maxage=3600",
					},
				});
			},
		},
	},
});
