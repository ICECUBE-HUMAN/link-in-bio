import type { PageItemLinkMetadata } from "./grid";

export type LinkProviderId =
	| "mailto"
	| "github"
	| "youtube"
	| "instagram"
	| "x"
	| "notion"
	| "generic-web";

export type LinkProviderFallbackTone =
	| "github"
	| "youtube"
	| "instagram"
	| "x"
	| "notion"
	| "neutral";

export type LinkProviderDefinition = {
	id: LinkProviderId;
	label: string;
	priority: number;
	fallbackTone: LinkProviderFallbackTone;
	match: (url: URL) => boolean;
};

export const linkProviderDefinitions: readonly LinkProviderDefinition[] = [
	{
		id: "mailto",
		label: "Email",
		priority: 100,
		fallbackTone: "neutral",
		match: (url) => url.protocol === "mailto:",
	},
	{
		id: "github",
		label: "GitHub",
		priority: 0,
		fallbackTone: "github",
		match: (url) => url.hostname.includes("github"),
	},
	{
		id: "youtube",
		label: "YouTube",
		priority: 0,
		fallbackTone: "youtube",
		match: (url) => url.hostname.includes("youtube"),
	},
	{
		id: "instagram",
		label: "Instagram",
		priority: 0,
		fallbackTone: "instagram",
		match: (url) => url.hostname.includes("instagram"),
	},
	{
		id: "x",
		label: "X",
		priority: 0,
		fallbackTone: "x",
		match: (url) =>
			url.hostname.includes("x.com") || url.hostname.includes("twitter"),
	},
	{
		id: "notion",
		label: "Notion",
		priority: 0,
		fallbackTone: "notion",
		match: (url) => url.hostname.includes("notion"),
	},
	{
		id: "generic-web",
		label: "Link",
		priority: -100,
		fallbackTone: "neutral",
		match: (url) => url.protocol === "https:",
	},
];

export function resolveLinkProviderDefinition(
	url: URL,
): LinkProviderDefinition {
	return (
		[...linkProviderDefinitions]
			.sort((left, right) => right.priority - left.priority)
			.find((provider) => provider.match(url)) ??
		linkProviderDefinitions[linkProviderDefinitions.length - 1]
	);
}

export function getLinkProviderPresentation(value: string): {
	id: LinkProviderId;
	label: string;
	fallbackTone: LinkProviderFallbackTone;
} {
	try {
		const url = new URL(value);
		const provider = resolveLinkProviderDefinition(url);
		if (provider.id === "mailto") {
			return {
				id: provider.id,
				label: url.pathname,
				fallbackTone: provider.fallbackTone,
			};
		}
		if (provider.id === "generic-web") {
			const hostname = url.hostname.replace(/^www\./, "");
			return {
				id: provider.id,
				label:
					hostname
						.split(".")[0]
						.replace(/[^a-z0-9]/gi, " ")
						.trim()
						.slice(0, 18) || provider.label,
				fallbackTone: provider.fallbackTone,
			};
		}
		return {
			id: provider.id,
			label: provider.label,
			fallbackTone: provider.fallbackTone,
		};
	} catch {
		return {
			id: "generic-web",
			label: "Link",
			fallbackTone: "neutral",
		};
	}
}

export function normalizeLinkUrl(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error("Link URL is required.");

	const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;
	const url = new URL(candidate);

	if (url.protocol === "mailto:") {
		if (!url.pathname.includes("@")) throw new Error("Invalid mailto URL.");
		return `mailto:${url.pathname}${url.search}${url.hash}`;
	}

	if (url.protocol !== "https:") throw new Error("HTTPS URL required.");
	return url.href;
}

export function createInitialLinkMetadata(value: string): PageItemLinkMetadata {
	const normalized = normalizeLinkUrl(value);
	const parsed = new URL(normalized);

	if (parsed.protocol === "mailto:") return { title: parsed.pathname };

	const hostname = parsed.hostname.replace(/^www\./, "");
	const path = parsed.pathname.replace(/^\//, "").replace(/\/$/, "");
	return {
		title: path ? `${hostname}/${path}` : hostname,
		faviconUrl: `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
	};
}
