import type { PageItemLinkMetadata } from "@sinabro/api";
import type {
	LinkProvider,
	LinkProviderContext,
} from "./link-providers";

const CHZZK_API_ORIGIN =
	"https://api.chzzk.naver.com";
const CHZZK_API_TIMEOUT_MS = 2500;

type ChzzkApiResponse = {
	content?: unknown;
};

function asRecord(
	value: unknown,
): Record<string, unknown> | undefined {
	return typeof value === "object" &&
		value !== null
		? (value as Record<string, unknown>)
		: undefined;
}

function asString(
	value: unknown,
): string | undefined {
	return typeof value === "string" &&
		value
		? value
		: undefined;
}

function getHttpsImageUrl(
	value: unknown,
	baseUrl: URL,
): string | undefined {
	const rawValue = asString(value);
	if (!rawValue) return undefined;
	try {
		const imageUrl = new URL(
			rawValue.replace("{type}", "480"),
			baseUrl,
		);
		return imageUrl.protocol ===
			"https:"
			? imageUrl.toString()
			: undefined;
	} catch {
		return undefined;
	}
}

async function fetchChzzkApi(
	path: string,
	context: LinkProviderContext,
): Promise<unknown> {
	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		CHZZK_API_TIMEOUT_MS,
	);

	try {
		const response =
			await context.fetch(
				`${CHZZK_API_ORIGIN}${path}`,
				{
					redirect: "manual",
					signal: controller.signal,
					headers: {
						accept: "application/json",
						"user-agent":
							"Sinabro Link Metadata/1.0",
					},
				},
			);
		const contentType = response.headers
			.get("content-type")
			?.toLowerCase();
		if (
			!response.ok ||
			!contentType?.includes(
				"application/json",
			)
		)
			return undefined;

		const payload =
			(await response.json()) as ChzzkApiResponse;
		return payload.content;
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

async function enrichChzzkRoute(
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const segments = url.pathname
		.split("/")
		.filter(Boolean);
	if (segments.length === 0) {
		return fallbackEnrich(url, context);
	}

	const [route, identifier] = segments;
	const channelIdPattern =
		/^[a-f\d]{32}$/i;

	if (
		segments.length === 1 &&
		channelIdPattern.test(route ?? "")
	) {
		const channel = asRecord(
			await fetchChzzkApi(
				`/service/v1/channels/${route}`,
				context,
			),
		);
		if (!channel) return {};
		return {
			title: asString(
				channel.channelName,
			),
			description: asString(
				channel.channelDescription,
			),
			imageUrl: getHttpsImageUrl(
				channel.channelImageUrl,
				url,
			),
		};
	}

	if (
		(route === "live" ||
			route === "livechat") &&
		channelIdPattern.test(
			identifier ?? "",
		)
	) {
		const live = asRecord(
			await fetchChzzkApi(
				`/service/v3.3/channels/${identifier}/live-detail`,
				context,
			),
		);
		if (!live) return {};
		const channel = asRecord(
			live.channel,
		);
		const channelName = asString(
			channel?.channelName,
		);
		const liveTitle = asString(
			live.liveTitle,
		);
		return {
			title:
				channelName && liveTitle
					? `${channelName} - ${liveTitle}`
					: (liveTitle ?? channelName),
			description: asString(
				live.liveCategoryValue,
			),
			imageUrl: getHttpsImageUrl(
				live.liveImageUrl,
				url,
			),
		};
	}

	if (
		route === "video" &&
		/^\d+$/.test(identifier ?? "")
	) {
		const video = asRecord(
			await fetchChzzkApi(
				`/service/v3/videos/${identifier}`,
				context,
			),
		);
		if (!video) return {};
		const channel = asRecord(
			video.channel,
		);
		const channelName = asString(
			channel?.channelName,
		);
		const videoTitle = asString(
			video.videoTitle,
		);
		return {
			title:
				channelName && videoTitle
					? `${channelName} - ${videoTitle}`
					: (videoTitle ?? channelName),
			description: asString(
				video.videoCategoryValue,
			),
			imageUrl: getHttpsImageUrl(
				video.thumbnailImageUrl,
				url,
			),
		};
	}

	if (route === "clips" && identifier) {
		const clip = asRecord(
			await fetchChzzkApi(
				`/service/v1/clips/${identifier}/detail`,
				context,
			),
		);
		if (!clip) return {};
		return {
			title: asString(clip.clipTitle),
			description: asString(
				clip.clipCategory,
			),
			imageUrl: getHttpsImageUrl(
				clip.thumbnailImageUrl,
				url,
			),
		};
	}

	return fallbackEnrich(url, context);
}

export function createChzzkEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return (url, context) =>
		enrichChzzkRoute(
			url,
			context,
			fallbackEnrich,
		);
}
