import type { LinkProvider } from "./link-providers";

/**
 * Twitch's public channel boundary does not expose a reliable unauthenticated
 * JSON metadata endpoint. Keep its provider boundary explicit while using the
 * shared bounded HTML parser for the OG metadata Twitch actually serves.
 */
export function createTwitchEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return fallbackEnrich;
}
