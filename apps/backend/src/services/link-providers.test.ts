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

	it("extracts Chzzk metadata from API-backed routes", async () => {
		const channelId =
			"c7f544c96a48239a73518866bb7b9564";
		const apiContent = new Map<
			string,
			unknown
		>([
			[
				`/service/v1/channels/${channelId}`,
				{
					channelName: "Chzzk Channel",
					channelDescription:
						"Channel description",
					channelImageUrl:
						"https://cdn.example.com/channel.jpg",
				},
			],
			[
				`/service/v3.3/channels/${channelId}/live-detail`,
				{
					liveTitle: "Live title",
					liveCategoryValue: "Category",
					liveImageUrl:
						"https://cdn.example.com/live_{type}.jpg",
					channel: {
						channelName:
							"Chzzk Channel",
					},
				},
			],
			[
				"/service/v3/videos/12345",
				{
					videoTitle: "Video title",
					videoCategoryValue:
						"Video category",
					thumbnailImageUrl:
						"https://cdn.example.com/video.jpg",
					channel: {
						channelName:
							"Chzzk Channel",
					},
				},
			],
			[
				"/service/v1/clips/clip123/detail",
				{
					clipTitle: "Clip title",
					clipCategory: "Clip category",
					thumbnailImageUrl:
						"https://cdn.example.com/clip.jpg",
				},
			],
		]);
		const fetchApi = async (
			input: RequestInfo | URL,
		) => {
			const path = new URL(
				String(input),
			).pathname;
			const content =
				apiContent.get(path);
			if (!content)
				throw new Error(
					`Unexpected Chzzk API path: ${path}`,
				);
			return new Response(
				JSON.stringify({
					code: 200,
					content,
				}),
				{
					headers: {
						"content-type":
							"application/json",
					},
				},
			);
		};
		const registry =
			createLinkProviderRegistry();

		const channel = await registry
			.resolve(
				new URL(
					`https://chzzk.naver.com/${channelId}`,
				),
			)
			.enrich(
				new URL(
					`https://chzzk.naver.com/${channelId}`,
				),
				{
					fetch: fetchApi,
				},
			);
		const live = await registry
			.resolve(
				new URL(
					`https://chzzk.naver.com/live/${channelId}`,
				),
			)
			.enrich(
				new URL(
					`https://chzzk.naver.com/live/${channelId}`,
				),
				{
					fetch: fetchApi,
				},
			);
		const video = await registry
			.resolve(
				new URL(
					"https://chzzk.naver.com/video/12345",
				),
			)
			.enrich(
				new URL(
					"https://chzzk.naver.com/video/12345",
				),
				{
					fetch: fetchApi,
				},
			);
		const clip = await registry
			.resolve(
				new URL(
					"https://chzzk.naver.com/clips/clip123",
				),
			)
			.enrich(
				new URL(
					"https://chzzk.naver.com/clips/clip123",
				),
				{
					fetch: fetchApi,
				},
			);

		expect(channel.imageUrl).toBe(
			"https://cdn.example.com/channel.jpg",
		);
		expect(live.imageUrl).toBe(
			"https://cdn.example.com/live_480.jpg",
		);
		expect(video.imageUrl).toBe(
			"https://cdn.example.com/video.jpg",
		);
		expect(clip.imageUrl).toBe(
			"https://cdn.example.com/clip.jpg",
		);
	});

	it("uses generic HTML metadata for unsupported Chzzk routes", async () => {
		const provider =
			resolveLinkProvider(
				new URL(
					"https://chzzk.naver.com/",
				),
			);

		const metadata =
			await provider.enrich(
				new URL(
					"https://chzzk.naver.com/",
				),
				{
					fetch: async () =>
						new Response(
							"<html><head><title>CHZZK</title><meta name=description content=Streaming></head></html>",
							{
								headers: {
									"content-type":
										"text/html",
								},
							},
						),
				},
			);

		expect(metadata).toEqual({
			title: "CHZZK",
			description: "Streaming",
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

	it("decodes HTML entities in metadata URLs", async () => {
		const provider =
			createLinkProviderRegistry().resolve(
				new URL(
					"https://threads.com/@example",
				),
			);

		const metadata =
			await provider.enrich(
				new URL(
					"https://threads.com/@example",
				),
				{
					fetch: async () =>
						new Response(
							'<html><head><meta property="og:image" content="https://cdn.example.com/avatar.jpg?width=640&amp;format=jpg&amp;token=abc"></head></html>',
							{
								headers: {
									"content-type":
										"text/html; charset=utf-8",
								},
							},
						),
				},
			);

		expect(metadata.imageUrl).toBe(
			"https://cdn.example.com/avatar.jpg?width=640&format=jpg&token=abc",
		);
	});

	it("follows bounded HTTPS redirects before extracting metadata", async () => {
		const provider =
			createLinkProviderRegistry().resolve(
				new URL("https://threads.com/"),
			);
		const requests: string[] = [];

		const metadata =
			await provider.enrich(
				new URL("https://threads.com/"),
				{
					fetch: async (input) => {
						const requestUrl = new URL(
							String(input),
						);
						requests.push(
							requestUrl.href,
						);
						if (
							requestUrl.hostname ===
							"threads.com"
						) {
							return new Response(
								null,
								{
									status: 301,
									headers: {
										location:
											"https://www.threads.com/",
									},
								},
							);
						}

						return new Response(
							'<html><head><meta property="og:image" content="/preview.webp"></head></html>',
							{
								headers: {
									"content-type":
										"text/html; charset=utf-8",
								},
							},
						);
					},
				},
			);

		expect(requests).toEqual([
			"https://threads.com/",
			"https://www.threads.com/",
		]);
		expect(metadata.imageUrl).toBe(
			"https://www.threads.com/preview.webp",
		);
	});

	it("extracts metadata from a large HTML head", async () => {
		const provider =
			createLinkProviderRegistry().resolve(
				new URL(
					"https://www.youtube.com/watch?v=example",
				),
			);
		const html = `<html><head>${"x".repeat(700 * 1024)}<meta property="og:image" content="https://cdn.example.com/video.jpg"></head></html>`;

		const metadata =
			await provider.enrich(
				new URL(
					"https://www.youtube.com/watch?v=example",
				),
				{
					fetch: async () =>
						new Response(html, {
							headers: {
								"content-type":
									"text/html; charset=utf-8",
							},
						}),
				},
			);

		expect(metadata.imageUrl).toBe(
			"https://cdn.example.com/video.jpg",
		);
	});

	it("accepts XHTML responses and metadata attributes in either order", async () => {
		const provider =
			createLinkProviderRegistry().resolve(
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
							'<html><head><meta content="https://cdn.example.com/preview.jpg" property="og:image" /></head></html>',
							{
								headers: {
									"content-type":
										"application/xhtml+xml",
								},
							},
						),
				},
			);

		expect(metadata.imageUrl).toBe(
			"https://cdn.example.com/preview.jpg",
		);
	});

	it("stops reading once all metadata is available", async () => {
		const provider =
			createLinkProviderRegistry().resolve(
				new URL(
					"https://example.com/page",
				),
			);
		const encoder = new TextEncoder();
		const chunks = [
			"<html><head><title>Example</title>",
			'<meta name="description" content="A description"><meta property="og:image" content="/preview.png">',
			"x".repeat(1024 * 1024),
			"</head></html>",
		];
		let chunkIndex = 0;
		let cancelled = false;

		const metadata =
			await provider.enrich(
				new URL(
					"https://example.com/page",
				),
				{
					fetch: async () =>
						new Response(
							new ReadableStream({
								pull(controller) {
									const chunk =
										chunks[
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
									cancelled = true;
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

		expect(metadata).toEqual({
			title: "Example",
			description: "A description",
			imageUrl:
				"https://example.com/preview.png",
		});
		expect(chunkIndex).toBeLessThan(
			chunks.length,
		);
		expect(cancelled).toBe(true);
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
