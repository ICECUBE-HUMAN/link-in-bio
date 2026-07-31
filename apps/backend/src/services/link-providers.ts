import {
	linkProviderDefinitions,
	type PageItemLinkMetadata,
} from "@sinabro/api";

const LINK_FETCH_TIMEOUT_MS = 2500;
const MAX_HEAD_BYTES = 512 * 1024;

export type LinkProviderContext = {
	fetch: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response>;
};

export type LinkProvider = {
	id: string;
	priority: number;
	match: (url: URL) => boolean;
	enrich: (
		url: URL,
		context: LinkProviderContext,
	) => Promise<PageItemLinkMetadata>;
};

async function readHeadText(
	response: Response,
): Promise<string> {
	if (!response.body) return "";
	const reader =
		response.body.getReader();
	const decoder = new TextDecoder();
	let text = "";
	let total = 0;

	try {
		for (;;) {
			const { done, value } =
				await reader.read();
			if (done) break;
			if (!value) continue;
			const remaining =
				MAX_HEAD_BYTES - total;
			const chunk =
				value.byteLength > remaining
					? value.subarray(0, remaining)
					: value;
			total += chunk.byteLength;

			text += decoder.decode(chunk, {
				stream: true,
			});
			if (/<\/head\s*>/i.test(text)) {
				await reader.cancel();
				return text;
			}
			if (
				chunk.byteLength <
				value.byteLength
			) {
				await reader.cancel();
				return "";
			}
		}
	} finally {
		reader.releaseLock();
	}

	return text + decoder.decode();
}

function getAttributeValue(
	attributes: string,
	name: string,
): string | undefined {
	const match = attributes.match(
		new RegExp(
			`${name}\\s*=\\s*["']([^"']+)["']`,
			"i",
		),
	);
	return (
		match?.[1]?.trim() || undefined
	);
}

function getMetaContent(
	html: string,
	property: string,
): string | undefined {
	const tagPattern =
		/<meta\b([^>]+)>/gi;
	for (const match of html.matchAll(
		tagPattern,
	)) {
		const attributes = match[1] ?? "";
		const key =
			getAttributeValue(
				attributes,
				"property",
			) ??
			getAttributeValue(
				attributes,
				"name",
			);
		if (
			key?.toLowerCase() !==
			property.toLowerCase()
		)
			continue;
		return getAttributeValue(
			attributes,
			"content",
		);
	}
	return undefined;
}

function getTitle(
	html: string,
): string | undefined {
	const title = html.match(
		/<title\b[^>]*>([\s\S]*?)<\/title>/i,
	)?.[1];
	return (
		title
			?.replace(/\s+/g, " ")
			.trim() || undefined
	);
}

function getHttpsImageUrl(
	value: string | undefined,
	baseUrl: URL,
) {
	if (!value) return undefined;
	try {
		const imageUrl = new URL(
			value,
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

async function enrichGenericWeb(
	url: URL,
	context: LinkProviderContext,
): Promise<PageItemLinkMetadata> {
	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		LINK_FETCH_TIMEOUT_MS,
	);

	try {
		const response =
			await context.fetch(url, {
				redirect: "manual",
				signal: controller.signal,
				headers: {
					accept:
						"text/html,application/xhtml+xml;q=0.9",
					"user-agent":
						"Sinabro Link Metadata/1.0",
				},
			});
		if (
			!response.ok ||
			!response.headers
				.get("content-type")
				?.includes("text/html")
		) {
			return {};
		}

		const html =
			await readHeadText(response);
		const image = getMetaContent(
			html,
			"og:image",
		);
		return {
			title: getTitle(html),
			description:
				getMetaContent(
					html,
					"description",
				) ??
				getMetaContent(
					html,
					"og:description",
				),
			imageUrl: getHttpsImageUrl(
				image,
				url,
			),
		};
	} catch {
		return {};
	} finally {
		clearTimeout(timeout);
	}
}

const genericWebProvider: LinkProvider =
	{
		id: "generic-web",
		priority: -100,
		match: (url) =>
			url.protocol === "https:",
		enrich: enrichGenericWeb,
	};

const sharedProviders: readonly LinkProvider[] =
	linkProviderDefinitions
		.filter(
			(definition) =>
				definition.id !== "generic-web",
		)
		.map((definition) => ({
			id: definition.id,
			priority: definition.priority,
			match: definition.match,
			enrich:
				definition.id === "mailto"
					? async (url) => ({
							title: url.pathname,
						})
					: enrichGenericWeb,
		}));

export function createLinkProviderRegistry(
	additionalProviders: readonly LinkProvider[] = [],
) {
	const providers = [
		...additionalProviders,
		...sharedProviders,
		genericWebProvider,
	].sort(
		(left, right) =>
			right.priority - left.priority,
	);

	return {
		resolve(url: URL): LinkProvider {
			return (
				providers.find((provider) =>
					provider.match(url),
				) ?? genericWebProvider
			);
		},
	};
}

export const linkProviderRegistry =
	createLinkProviderRegistry();

export function resolveLinkProvider(
	url: URL,
): LinkProvider {
	return linkProviderRegistry.resolve(url);
}
