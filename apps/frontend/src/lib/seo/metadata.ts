import { env } from "@/env";
import { getSiteUrl } from "@/lib/site/site-url";

type JsonLdNode = Record<string, unknown>;
type LlmsResource = {
	name: string;
	url: string;
	description?: string;
};

type MetadataInput = {
	title?: string;
	description?: string;
	canonicalPath?: string;
	image?: string;
	keywords?: string[];
	noIndex?: boolean;
	type?: "website" | "article";
	siteName?: string;
	locale?: string;
	publishedTime?: string;
	modifiedTime?: string;
	jsonLd?: JsonLdNode | JsonLdNode[];
};

type RouteHead = {
	meta: Array<Record<string, string>>;
	links: Array<Record<string, string>>;
	scripts: Array<Record<string, string>>;
};

export const DEFAULT_SITE_NAME = env.VITE_APP_TITLE?.trim() || "Cream";

export const DEFAULT_APP_LOGO = "/favicon.ico";

export const DEFAULT_SEO_DESCRIPTION = "Built with interest and long solitude.";

const DEFAULT_LOCALE = "en_US";

export const defaultHeadLinks = [
	{
		rel: "apple-touch-icon",
		sizes: "180x180",
		href: "/apple-touch-icon.png",
	},
	{
		rel: "icon",
		type: "image/png",
		sizes: "32x32",
		href: "/favicon-32x32.png",
	},
	{
		rel: "icon",
		type: "image/png",
		sizes: "16x16",
		href: "/favicon-16x16.png",
	},
	{
		rel: "icon",
		href: "/favicon.ico",
	},
	{
		rel: "manifest",
		href: "/manifest.json",
	},
] satisfies Array<Record<string, string>>;

function isAbsoluteUrl(value: string) {
	return /^https?:\/\//.test(value);
}

export function withSiteUrl(value: string, siteUrl?: string) {
	if (isAbsoluteUrl(value)) {
		return value;
	}

	if (!siteUrl) {
		return value;
	}

	return new URL(value, siteUrl).toString();
}

function buildTitle(title: string | undefined, siteName: string) {
	return title ? `${title} | ${siteName}` : siteName;
}

function toJsonLdScripts(jsonLd?: MetadataInput["jsonLd"]) {
	const items = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

	return items.map((item) => ({
		type: "application/ld+json",
		children: JSON.stringify(item),
	}));
}

export function createSeo(
	input: MetadataInput = {},
	siteUrl?: string,
): RouteHead {
	const resolvedSiteUrl = siteUrl ?? getSiteUrl();
	const siteName = input.siteName ?? DEFAULT_SITE_NAME;
	const title = buildTitle(input.title, siteName);
	const canonicalUrl = input.canonicalPath
		? withSiteUrl(input.canonicalPath, resolvedSiteUrl)
		: undefined;
	const imageUrl = input.image
		? withSiteUrl(input.image, resolvedSiteUrl)
		: undefined;

	const meta: RouteHead["meta"] = [
		{ title },
		...(input.description
			? [{ name: "description", content: input.description }]
			: []),
		...(input.keywords?.length
			? [{ name: "keywords", content: input.keywords.join(", ") }]
			: []),
		{ property: "og:site_name", content: siteName },
		{ property: "og:title", content: title },
		...(input.description
			? [{ property: "og:description", content: input.description }]
			: []),
		{ property: "og:type", content: input.type ?? "website" },
		{ property: "og:locale", content: input.locale ?? DEFAULT_LOCALE },
		...(canonicalUrl ? [{ property: "og:url", content: canonicalUrl }] : []),
		...(imageUrl ? [{ property: "og:image", content: imageUrl }] : []),
		{
			name: "twitter:card",
			content: imageUrl ? "summary_large_image" : "summary",
		},
		{ name: "twitter:title", content: title },
		...(input.description
			? [{ name: "twitter:description", content: input.description }]
			: []),
		...(imageUrl ? [{ name: "twitter:image", content: imageUrl }] : []),
		...(input.noIndex
			? [{ name: "robots", content: "noindex, nofollow" }]
			: []),
		...(input.publishedTime
			? [{ property: "article:published_time", content: input.publishedTime }]
			: []),
		...(input.modifiedTime
			? [{ property: "article:modified_time", content: input.modifiedTime }]
			: []),
	];

	return {
		meta,
		links: canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : [],
		scripts: toJsonLdScripts(input.jsonLd),
	};
}

export function createLlmsText(input: {
	title: string;
	description: string;
	resources: LlmsResource[];
}) {
	const lines = [
		`# ${input.title}`,
		"",
		input.description,
		"",
		"## Key Resources",
		"",
		...input.resources.flatMap((resource) => [
			`- ${resource.name}: ${resource.url}`,
			...(resource.description ? [`  ${resource.description}`] : []),
		]),
	];

	return `${lines.join("\n").trim()}\n`;
}
