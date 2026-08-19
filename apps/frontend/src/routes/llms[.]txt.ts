import { createFileRoute } from "@tanstack/react-router";
import { allPosts } from "content-collections";
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
						"Grabbin is a flexible link in bio service for presenting your identity, links, media, and favorite places in one personal page.",
					resources: [
						{
							name: "Home",
							url: toAbsoluteUrl("/", siteUrl),
							description:
								"Overview of the link in bio service and its main features.",
						},
						{
							name: "Blog",
							url: toAbsoluteUrl("/blog", siteUrl),
							description:
								"Link in bio guides for creators and small businesses.",
						},
						...allPosts.map((post) => ({
							name: post.title,
							url: toAbsoluteUrl(
								`/blog/${encodeURIComponent(post.slug)}`,
								siteUrl,
							),
							description: post.description,
						})),
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
