import {
	DEFAULT_APP_LOGO,
	DEFAULT_SITE_NAME,
	withSiteUrl,
} from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/site/site-url";

export function createWebSiteJsonLd(input: {
	name?: string;
	description?: string;
	path?: string;
	siteUrl?: string;
}) {
	const name = input.name ?? DEFAULT_SITE_NAME;
	const url = withSiteUrl(input.path ?? "/", input.siteUrl ?? getSiteUrl());

	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name,
		url,
		...(input.description ? { description: input.description } : {}),
	};
}

export function createWebPageJsonLd(input: {
	title: string;
	description?: string;
	path: string;
	siteUrl?: string;
}) {
	const url = withSiteUrl(input.path, input.siteUrl ?? getSiteUrl());

	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		name: input.title,
		url,
		...(input.description ? { description: input.description } : {}),
	};
}

export function createProfilePageJsonLd(input: {
	title: string;
	handle: string;
	description?: string;
	path: string;
	image?: string;
	siteUrl?: string;
}) {
	const siteUrl = input.siteUrl ?? getSiteUrl();
	const url = withSiteUrl(input.path, siteUrl);
	const image = input.image ? withSiteUrl(input.image, siteUrl) : undefined;

	return {
		"@context": "https://schema.org",
		"@type": "ProfilePage",
		name: input.title,
		url,
		...(input.description ? { description: input.description } : {}),
		mainEntity: {
			"@type": "Person",
			name: input.title,
			alternateName: `@${input.handle}`,
			url,
			...(input.description ? { description: input.description } : {}),
			...(image ? { image } : {}),
		},
	};
}

export function createOrganizationJsonLd(input?: {
	name?: string;
	url?: string;
	logoPath?: string;
	description?: string;
}) {
	const siteUrl = input?.url ?? getSiteUrl();
	const name = input?.name ?? DEFAULT_SITE_NAME;
	const logo = input?.logoPath
		? withSiteUrl(input.logoPath, siteUrl)
		: siteUrl
			? new URL(DEFAULT_APP_LOGO, siteUrl).toString()
			: undefined;

	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name,
		...(siteUrl ? { url: siteUrl } : {}),
		...(input?.description ? { description: input.description } : {}),
		...(logo
			? {
					logo: {
						"@type": "ImageObject",
						url: logo,
					},
				}
			: {}),
	};
}

export function createBlogPostingJsonLd(input: {
	title: string;
	description?: string;
	path: string;
	publishedTime: string;
	modifiedTime?: string;
	image?: string;
	siteUrl?: string;
	authors?: string[];
	section?: string;
	publisher?: Record<string, unknown>;
}) {
	const siteUrl = input.siteUrl ?? getSiteUrl();
	const url = withSiteUrl(input.path, siteUrl);
	const image = input.image ? withSiteUrl(input.image, siteUrl) : undefined;

	return {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: input.title,
		description: input.description,
		url,
		datePublished: input.publishedTime,
		...(input.modifiedTime ? { dateModified: input.modifiedTime } : {}),
		...(input.section ? { articleSection: input.section } : {}),
		...(image ? { image } : {}),
		...(input.authors?.length
			? {
					author: input.authors.map((name) => ({
						"@type": "Person",
						name,
					})),
				}
			: {}),
		...(input.publisher ? { publisher: input.publisher } : {}),
	};
}
