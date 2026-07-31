import {
	describe,
	expect,
	it,
} from "bun:test";
import { createYoutubeEnricher } from "./youtube-link-provider";

describe("youtube link provider", () => {
	it("uses YouTube oEmbed metadata for video URLs", async () => {
		const requests: string[] = [];
		const enrich =
			createYoutubeEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://www.youtube.com/watch?v=video123",
			),
			{
				fetch: async (input) => {
					requests.push(String(input));
					return new Response(
						JSON.stringify({
							title: "Video title",
							author_name: "Creator",
							thumbnail_url:
								"https://i.ytimg.com/vi/video123/hqdefault.jpg",
						}),
						{
							headers: {
								"content-type":
									"application/json",
							},
						},
					);
				},
			},
		);

		expect(requests).toHaveLength(1);
		expect(
			new URL(requests[0] ?? "")
				.pathname,
		).toBe("/oembed");
		expect(metadata).toEqual({
			title: "Video title",
			description: "Creator",
			imageUrl:
				"https://i.ytimg.com/vi/video123/hqdefault.jpg",
		});
	});

	it("falls back for YouTube channel URLs", async () => {
		let fallbackCalled = false;
		const enrich =
			createYoutubeEnricher(
				async () => {
					fallbackCalled = true;
					return {
						title: "Channel title",
						imageUrl:
							"https://cdn.example.com/channel.jpg",
					};
				},
			);

		const metadata = await enrich(
			new URL(
				"https://www.youtube.com/@creator",
			),
			{
				fetch: async () => {
					throw new Error(
						"channel routes should use fallback",
					);
				},
			},
		);

		expect(fallbackCalled).toBe(true);
		expect(metadata.imageUrl).toBe(
			"https://cdn.example.com/channel.jpg",
		);
	});
});
