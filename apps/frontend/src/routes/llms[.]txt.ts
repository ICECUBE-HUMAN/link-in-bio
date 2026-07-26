import { createFileRoute } from "@tanstack/react-router";
import { allPosts } from "content-collections";
import { env } from "@/env";
import { createLlmsText } from "@/lib/seo/metadata";
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
				const title = env.VITE_APP_TITLE?.trim() || "TanStack Start Starter";
				const body = createLlmsText({
					title,
					description:
						"A TanStack Start starter with SSR, structured metadata, authentication, and markdown-backed blog content.",
					resources: [
						{
							name: "Home",
							url: toAbsoluteUrl("/", siteUrl),
							description:
								"Top-level overview of the site and primary navigation.",
						},
						{
							name: "Blog Index",
							url: toAbsoluteUrl("/blog", siteUrl),
							description: "Collection of markdown-backed posts and updates.",
						},
						{
							name: "Privacy Policy",
							url: toAbsoluteUrl("/privacy", siteUrl),
							description: "Starter privacy policy page.",
						},
						{
							name: "Terms of Service",
							url: toAbsoluteUrl("/terms", siteUrl),
							description: "Starter terms of service page.",
						},
						...allPosts.map((post) => ({
							name: post.title,
							url: toAbsoluteUrl(`/blog/${post.slug}`, siteUrl),
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
