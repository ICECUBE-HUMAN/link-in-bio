import type { PageItemLinkMetadata } from "./grid";

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
