import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { getPageByHandle } from "@/lib/api/pages.functions";
import { getProfileImageUrl } from "@/lib/api/profile-image-api";

const WIDTH = 1200;
const HEIGHT = 630;

function toBase64(data: ArrayBuffer) {
	const bytes = new Uint8Array(data);
	let binary = "";
	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return btoa(binary);
}

function escapeXml(value: string) {
	return value.replace(
		/[&<>'"]/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&apos;",
			})[character] ?? character,
	);
}

function createImageSvg({
	logoData,
	regularFontData,
	boldFontData,
	pageImageData,
	pageName,
}: {
	logoData: string;
	regularFontData: string;
	boldFontData: string;
	pageImageData: string;
	pageName?: string;
}) {
	const pageContent = pageName
		? `
			<clipPath id="page-image-clip">
				<circle cx="600" cy="245" r="90" />
			</clipPath>
			<image
				href="${pageImageData}"
				x="510"
				y="155"
				width="180"
				height="180"
				preserveAspectRatio="xMidYMid slice"
				clip-path="url(#page-image-clip)"
			/>
			<text
				x="600"
				y="395"
				text-anchor="middle"
				font-family="Inter, Arial, sans-serif"
				font-size="48"
				font-weight="700"
				fill="#171717"
			>${escapeXml(pageName)}</text>
		`
		: `
			<g
				font-family="Inter, Arial, sans-serif"
				font-size="60"
				font-weight="700"
				fill="#171717"
			>
				<text x="72" y="500">A cleaner, more beautiful</text>
				<text x="72" y="562">Link in Bio</text>
			</g>
		`;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
		<style>
			@font-face { font-family: Inter; font-weight: 400; src: url(data:font/ttf;base64,${regularFontData}); }
			@font-face { font-family: Inter; font-weight: 700; src: url(data:font/ttf;base64,${boldFontData}); }
		</style>
		<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff" />
		<image href="${logoData}" x="72" y="64" width="44" height="44" />
		<text x="126" y="98" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="#171717">Grabbin</text>
		${pageContent}
	</svg>`;
}

export const Route = createFileRoute("/og.png")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const requestUrl = new URL(request.url, "http://localhost");
				const handle = requestUrl.searchParams.get("handle")?.trim();
				const [
					regularFontResponse,
					boldFontResponse,
					logoResponse,
					pageResult,
				] = await Promise.all([
					env.ASSETS.fetch(
						new Request(new URL("/fonts/Inter-Regular.ttf", requestUrl)),
					),
					env.ASSETS.fetch(
						new Request(new URL("/fonts/Inter-Bold.ttf", requestUrl)),
					),
					env.ASSETS.fetch(new Request(new URL("/logo512.png", requestUrl))),
					handle ? getPageByHandle({ data: { handle } }) : null,
				]);

				if (
					!regularFontResponse.ok ||
					!boldFontResponse.ok ||
					!logoResponse.ok
				) {
					return new Response("OG image assets unavailable.", { status: 500 });
				}

				const [regularFontData, boldFontData, logoData] = await Promise.all([
					regularFontResponse.arrayBuffer(),
					boldFontResponse.arrayBuffer(),
					logoResponse.arrayBuffer(),
				]);
				const logoDataUrl = `data:image/png;base64,${toBase64(logoData)}`;
				const page = pageResult?.page;
				const pageName = page?.name?.trim() || handle?.replaceAll("/", "");
				let pageImageDataUrl = logoDataUrl;

				const pageImageUrl = page
					? getProfileImageUrl(page.image, page.updatedAt)
					: null;
				if (pageImageUrl) {
					const pageImageResponse = await fetch(pageImageUrl);
					if (pageImageResponse.ok) {
						pageImageDataUrl = `data:${pageImageResponse.headers.get("content-type") ?? "image/png"};base64,${toBase64(await pageImageResponse.arrayBuffer())}`;
					}
				}

				const imageSvg = createImageSvg({
					logoData: logoDataUrl,
					regularFontData: toBase64(regularFontData),
					boldFontData: toBase64(boldFontData),
					pageImageData: pageImageDataUrl,
					pageName,
				});

				return new Response(imageSvg, {
					headers: {
						"Cache-Control": "public, max-age=300",
						"Content-Type": "image/svg+xml; charset=utf-8",
					},
				});
			},
		},
	},
});
