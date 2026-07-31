import type { PageItemLinkMetadata } from "@sinabro/api";
import type {
	LinkProvider,
	LinkProviderContext,
} from "./link-providers";

const DISCORD_API_ORIGIN =
	"https://discord.com";
const DISCORD_API_TIMEOUT_MS = 2500;

type DiscordInviteResponse = {
	guild?: unknown;
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

function getInviteCode(
	url: URL,
): string | undefined {
	const hostname =
		url.hostname.toLowerCase();
	const segments = url.pathname
		.split("/")
		.filter(Boolean);

	if (hostname === "discord.gg") {
		return segments.length === 1
			? segments[0]
			: undefined;
	}

	if (
		[
			"discord.com",
			"www.discord.com",
			"discordapp.com",
			"www.discordapp.com",
		].includes(hostname) &&
		segments.length === 2 &&
		segments[0] === "invite"
	)
		return segments[1];

	return undefined;
}

function getDiscordImageUrl(
	guildId: string | undefined,
	imageHash: string | undefined,
	kind: "icons" | "banners",
): string | undefined {
	if (!guildId || !imageHash)
		return undefined;
	const extension =
		imageHash.startsWith("a_")
			? "gif"
			: "png";
	return `https://cdn.discordapp.com/${kind}/${encodeURIComponent(guildId)}/${encodeURIComponent(imageHash)}.${extension}?size=512`;
}

async function fetchDiscordInvite(
	code: string,
	context: LinkProviderContext,
): Promise<
	DiscordInviteResponse | undefined
> {
	const controller =
		new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		DISCORD_API_TIMEOUT_MS,
	);

	try {
		const endpoint = `${DISCORD_API_ORIGIN}/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`;
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
			? (payload as DiscordInviteResponse)
			: undefined;
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

async function enrichDiscordRoute(
	url: URL,
	context: LinkProviderContext,
	fallbackEnrich: LinkProvider["enrich"],
): Promise<PageItemLinkMetadata> {
	const code = getInviteCode(url);
	if (!code)
		return fallbackEnrich(url, context);

	const payload =
		await fetchDiscordInvite(
			code,
			context,
		);
	const guild = asRecord(
		payload?.guild,
	);
	if (!guild)
		return fallbackEnrich(url, context);

	const guildId = asString(guild.id);
	const iconUrl = getDiscordImageUrl(
		guildId,
		asString(guild.icon),
		"icons",
	);
	const bannerUrl = getDiscordImageUrl(
		guildId,
		asString(guild.banner),
		"banners",
	);
	const metadata: PageItemLinkMetadata =
		{
			title: asString(guild.name),
			description: asString(
				guild.description,
			),
			imageUrl: iconUrl ?? bannerUrl,
		};
	if (
		metadata.title ||
		metadata.description ||
		metadata.imageUrl
	)
		return metadata;

	return fallbackEnrich(url, context);
}

export function createDiscordEnricher(
	fallbackEnrich: LinkProvider["enrich"],
): LinkProvider["enrich"] {
	return (url, context) =>
		enrichDiscordRoute(
			url,
			context,
			fallbackEnrich,
		);
}
