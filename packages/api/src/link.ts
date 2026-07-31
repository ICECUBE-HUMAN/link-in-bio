import type { PageItemLinkMetadata } from "./grid";

export type LinkProviderId =
	| "mailto"
	| "github"
	| "youtube"
	| "discord"
	| "instagram"
	| "x"
	| "spotify"
	| "threads"
	| "buy-me-a-coffee"
	| "linkedin"
	| "chzzk"
	| "figma"
	| "ko-fi"
	| "gumroad"
	| "medium"
	| "patreon"
	| "product-hunt"
	| "reddit"
	| "tiktok"
	| "twitch"
	| "behance"
	| "dribbble"
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
		id: "discord",
		label: "Discord",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("discord"),
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
		id: "spotify",
		label: "Spotify",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("spotify"),
	},
	{
		id: "threads",
		label: "Threads",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("threads"),
	},
	{
		id: "buy-me-a-coffee",
		label: "Buy Me a Coffee",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("buymeacoffee"),
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("linkedin"),
	},
	{
		id: "chzzk",
		label: "CHZZK",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("chzzk"),
	},
	{
		id: "figma",
		label: "Figma",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("figma"),
	},
	{
		id: "ko-fi",
		label: "Ko-fi",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("ko-fi"),
	},
	{
		id: "gumroad",
		label: "Gumroad",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("gumroad"),
	},
	{
		id: "medium",
		label: "Medium",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("medium"),
	},
	{
		id: "patreon",
		label: "Patreon",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("patreon"),
	},
	{
		id: "product-hunt",
		label: "Product Hunt",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("producthunt"),
	},
	{
		id: "reddit",
		label: "Reddit",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("reddit"),
	},
	{
		id: "tiktok",
		label: "TikTok",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("tiktok"),
	},
	{
		id: "twitch",
		label: "Twitch",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("twitch"),
	},
	{
		id: "behance",
		label: "Behance",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("behance"),
	},
	{
		id: "dribbble",
		label: "Dribbble",
		priority: 0,
		fallbackTone: "neutral",
		match: (url) => url.hostname.includes("dribbble"),
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

export const linkProviderIconObjectKeys = {
	youtube: "assets/link-provider-icon/youtube.svg",
	discord: "assets/link-provider-icon/discord.svg",
	github: "assets/link-provider-icon/github.svg",
	x: "assets/link-provider-icon/x.svg",
	spotify: "assets/link-provider-icon/spotify.svg",
	threads: "assets/link-provider-icon/threads.svg",
	instagram: "assets/link-provider-icon/instagram.svg",
	"buy-me-a-coffee": "assets/link-provider-icon/buy-me-a-coffee.svg",
	linkedin: "assets/link-provider-icon/linkedin.svg",
	chzzk: "assets/link-provider-icon/chzzk.svg",
	figma: "assets/link-provider-icon/figma.svg",
	"ko-fi": "assets/link-provider-icon/ko-fi.svg",
	gumroad: "assets/link-provider-icon/gumroad.svg",
	medium: "assets/link-provider-icon/medium.svg",
	patreon: "assets/link-provider-icon/patreon.svg",
	"product-hunt": "assets/link-provider-icon/product-hunt.svg",
	reddit: "assets/link-provider-icon/reddit.svg",
	tiktok: "assets/link-provider-icon/tiktok.svg",
	twitch: "assets/link-provider-icon/twitch.svg",
	behance: "assets/link-provider-icon/behance.svg",
	dribbble: "assets/link-provider-icon/dribbble.svg",
} satisfies Partial<Record<LinkProviderId, string>>;

export function getLinkProviderIconObjectKey(
	provider: string,
): string | undefined {
	if (!(provider in linkProviderIconObjectKeys)) return undefined;
	return linkProviderIconObjectKeys[
		provider as keyof typeof linkProviderIconObjectKeys
	];
}

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
