import {
	describe,
	expect,
	it,
} from "bun:test";
import { createTwitchEnricher } from "./twitch-link-provider";

describe("twitch link provider", () => {
	it("uses the bounded generic HTML extractor without fabricating images", async () => {
		let fallbackCalled = false;
		const enrich = createTwitchEnricher(
			async () => {
				fallbackCalled = true;
				return {
					title: "Twitch",
					description:
						"Streaming platform",
					imageUrl:
						"https://static.example.com/twitch.jpg",
				};
			},
		);

		const metadata = await enrich(
			new URL(
				"https://www.twitch.tv/creator",
			),
			{
				fetch: async () => {
					throw new Error(
						"Twitch provider should delegate to HTML fallback",
					);
				},
			},
		);

		expect(fallbackCalled).toBe(true);
		expect(metadata).toEqual({
			title: "Twitch",
			description: "Streaming platform",
			imageUrl:
				"https://static.example.com/twitch.jpg",
		});
	});
});
