import {
	describe,
	expect,
	it,
} from "bun:test";
import {
	createLinkProviderRegistry,
	resolveLinkProvider,
} from "@services/link-providers";

describe("link provider registry", () => {
	it("uses a no-fetch provider for mailto links", async () => {
		let fetchCalled = false;
		const provider =
			resolveLinkProvider(
				new URL(
					"mailto:hello@example.com",
				),
			);

		const metadata =
			await provider.enrich(
				new URL(
					"mailto:hello@example.com",
				),
				{
					fetch: async () => {
						fetchCalled = true;
						throw new Error(
							"mailto must not fetch",
						);
					},
				},
			);

		expect(provider.id).toBe("mailto");
		expect(fetchCalled).toBe(false);
		expect(metadata).toEqual({
			title: "hello@example.com",
		});
	});

	it("allows a specific provider to override the generic provider", async () => {
		const registry =
			createLinkProviderRegistry([
				{
					id: "example",
					priority: 10,
					match: (url) =>
						url.hostname ===
						"example.com",
					enrich: async () => ({
						title: "Provider title",
						provider: "example",
						providerData: {
							audience: 42,
						},
					}),
				},
			]);

		const provider = registry.resolve(
			new URL("https://example.com"),
		);
		expect(provider.id).toBe("example");
		expect(
			await provider.enrich(
				new URL("https://example.com"),
				{
					fetch,
				},
			),
		).toEqual({
			title: "Provider title",
			provider: "example",
			providerData: { audience: 42 },
		});
	});

	it("extracts bounded HTML metadata from the generic provider", async () => {
		const registry =
			createLinkProviderRegistry();
		const provider = registry.resolve(
			new URL(
				"https://example.com/page",
			),
		);

		const metadata =
			await provider.enrich(
				new URL(
					"https://example.com/page",
				),
				{
					fetch: async () =>
						new Response(
							'<html><head><title>Example</title><meta name="description" content="A description"><meta property="og:image" content="/preview.png"></head></html>',
							{
								headers: {
									"content-type":
										"text/html; charset=utf-8",
								},
							},
						),
				},
			);

		expect(provider.id).toBe(
			"generic-web",
		);
		expect(metadata).toEqual({
			title: "Example",
			description: "A description",
			imageUrl:
				"https://example.com/preview.png",
		});
	});

	it("stops reading after the head of a large document", async () => {
		const encoder = new TextEncoder();
		const chunks = [
			"<html><head><title>Linear</tit",
			'le><meta property="og:description" content="A large app"></head>',
			"x".repeat(1024 * 1024),
			"unread",
		];
		let chunkIndex = 0;
		let cancelled = false;

		const metadata =
			await enrichWithChunks(
				chunks,
				() => {
					cancelled = true;
				},
			);

		expect(metadata).toEqual({
			title: "Linear",
			description: "A large app",
		});
		expect(chunkIndex).toBeLessThan(
			chunks.length,
		);
		expect(cancelled).toBe(true);

		async function enrichWithChunks(
			bodyChunks: string[],
			onCancel: () => void,
		) {
			const provider =
				createLinkProviderRegistry().resolve(
					new URL(
						"https://linear.app/",
					),
				);
			return provider.enrich(
				new URL("https://linear.app/"),
				{
					fetch: async () =>
						new Response(
							new ReadableStream({
								pull(controller) {
									const chunk =
										bodyChunks[
											chunkIndex++
										];
									if (
										chunk === undefined
									) {
										controller.close();
										return;
									}
									controller.enqueue(
										encoder.encode(
											chunk,
										),
									);
								},
								cancel() {
									onCancel();
								},
							}),
							{
								headers: {
									"content-type":
										"text/html; charset=utf-8",
								},
							},
						),
				},
			);
		}
	});

	it("finds head metadata inside a single large response chunk", async () => {
		const head =
			'<html><head><meta name="description" content="A large chunk"></head>';
		const provider =
			createLinkProviderRegistry().resolve(
				new URL("https://linear.app/"),
			);

		const metadata =
			await provider.enrich(
				new URL("https://linear.app/"),
				{
					fetch: async () =>
						new Response(
							`${head}${"x".repeat(2 * 1024 * 1024)}`,
							{
								headers: {
									"content-type":
										"text/html; charset=utf-8",
								},
							},
						),
				},
			);

		expect(metadata).toEqual({
			description: "A large chunk",
		});
	});
});
