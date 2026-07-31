import type { PageItemLinkMetadata } from "@sinabro/api";
import type {
	LinkProvider,
	LinkProviderContext,
} from "./link-providers";

const YOUTUBE_OEMBED_ORIGIN =
	"https://www.youtube.com";
const YOUTUBE_OEMBED_TIMEOUT_MS = 2500;

type YoutubeOembedResponse = {
	title?: unknown;
	author_name?: unknown;
	thumbnail_url?: unknown;
};

function asString(
	value: unknown,
): string | undefined {
	return typeof value === "string" &&
		value
		? value
		: undefined;
}

function getHttpsUrl(
	value: unknown,
): string | undefined {
	const rawValue = asString(value);
	if (!rawValue) return undefined;
	try {
		const imageUrl = new URL(
			rawValue,
			YOUTUBE_OEMBED_ORIGIN,
		);
		return imageUrl.protocol ===
			"https:"
			? imageUrl.toString()
			: undefined;
	} catch {
		return undefined;
	}
}

function isYoutubeVideoUrl(
	url: URL,
): boolean {
	const hostname =
		url.hostname.toLowerCase();
	if (hostname === "youtu.be") {
		return (
			url.pathname
				.split("/")
				.filter(Boolean).length === 1
		);
	}

	if (
		![
			"youtube.com",
			"www.youtube.com",
			"m.youtube.com",
			"music.youtube.com",
		].includes(hostname)
	)
		return false;

	const segments = url.pathname
		.split("/")
		.filter(Boolean);
	const firstSegment = segments[0];
	return (
		(firstSegment === "watch" &&
			Boolean(
				url.searchParams.get("v"),
			)) ||
		([
			"shorts",
			"embed",
			"live",
		].includes(firstSegment ?? "") &&
			segments.length === 2)
	);
}

async function fetchYoutubeOembed(
	url: URL,
	context: LinkProviderContext,
): Promise<
	YoutubeOembedResponse | undefined
> {
	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		YOUTUBE_OEMBED_TIMEOUT_MS,
	);

	try {
		const endpoint = new URL(
			"/oembed",
			YOUTUBE_OEMBED_ORIGIN,
		);
		endpoint.searchParams.set(
			"url",
			url.href,
		);
		endpoint.searchParams.set(
			"format",
			"json",
		);
		const response =
			await context.fetch(endpoint, {
				redirect: "manual",
				signal: controller.signal,
				headers: {
					accept: "application/json",
					"user-agent":
						"Sinabro Link Metadata/1.0",
				},
			});
		if (!response.ok) return undefined;
		const payload =
			(await response.json()) as unknown;
		return typeof payload ===
			"object" && payload !== null
			? (payload as YoutubeOembedResponse)
			: undefined;
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

async function enrichYoutubeRoute(
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	if (!isYoutubeVideoUrl(url)) {
		return fallbackEnrich(url, context);
	}

	const oembed =
		await fetchYoutubeOembed(
			url,
			context,
		);
	if (!oembed) {
		return fallbackEnrich(url, context);
	}

	const metadata: PageItemLinkMetadata =
		{
			title: asString(oembed.title),
			description: asString(
				oembed.author_name,
			),
			imageUrl: getHttpsUrl(
				oembed.thumbnail_url,
			),
		};
	if (
		metadata.title ||
		metadata.description ||
		metadata.imageUrl
	)
		return metadata;

	return fallbackEnrich(url, context);
}

export function createYoutubeEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return (url, context) =>
		enrichYoutubeRoute(
			url,
			context,
			fallbackEnrich,
		);
}
