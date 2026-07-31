import {
	describe,
	expect,
	it,
} from "bun:test";
import { createDiscordEnricher } from "./discord-link-provider";

describe("discord link provider", () => {
	it("extracts invite metadata and derives the guild icon URL", async () => {
		const enrich =
			createDiscordEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://discord.gg/discord-developers",
			),
			{
				fetch: async (input) => {
					expect(String(input)).toBe(
						"https://discord.com/api/v10/invites/discord-developers?with_counts=true",
					);
					return new Response(
						JSON.stringify({
							guild: {
								id: "guild123",
								name: "Discord Developers",
								description:
									"Developer community",
								icon: "a_animated-icon",
							},
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

		expect(metadata).toEqual({
			title: "Discord Developers",
			description:
				"Developer community",
			imageUrl:
				"https://cdn.discordapp.com/icons/guild123/a_animated-icon.gif?size=512",
		});
	});

	it("does not invent an image when an invite has no guild icon", async () => {
		const enrich =
			createDiscordEnricher(
				async () => ({
					title: "fallback",
				}),
			);

		const metadata = await enrich(
			new URL(
				"https://discord.com/invite/no-icon",
			),
			{
				fetch: async () =>
					new Response(
						JSON.stringify({
							guild: {
								id: "guild123",
								name: "No Icon",
							},
						}),
						{
							headers: {
								"content-type":
									"application/json",
							},
						},
					),
			},
		);

		expect(metadata).toEqual({
			title: "No Icon",
		});
	});
});
