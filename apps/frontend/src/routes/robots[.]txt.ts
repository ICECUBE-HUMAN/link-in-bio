import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/lib/site/site-url";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const origin = getSiteUrl() ?? new URL(request.url).origin;
				const body = [
					"User-agent: *",
					"Disallow:",
					`Sitemap: ${new URL("/sitemap.xml", origin)}`,
				].join("\n");

				return new Response(`${body}\n`, {
					headers: {
						"Content-Type": "text/plain; charset=utf-8",
						"Cache-Control": "public, max-age=0, s-maxage=3600",
					},
				});
			},
		},
	},
});
