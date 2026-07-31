import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";

const MAX_IMAGE_BYTES = 256 * 1024;

function isAllowedImageUrl(imageUrl: URL, requestUrl: URL) {
	if (imageUrl.origin === requestUrl.origin) {
		return imageUrl.pathname === "/favicon.ico";
	}

	if (!env.VITE_R2_PUBLIC_URL) return false;

	try {
		return imageUrl.origin === new URL(env.VITE_R2_PUBLIC_URL).origin;
	} catch {
		return false;
	}
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

function toBase64(bytes: Uint8Array) {
	let binary = "";
	const chunkSize = 0x8000;

	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
	}

	return btoa(binary);
}

export const Route = createFileRoute("/api/favicon")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const requestUrl = new URL(request.url);
				const imageParameter = requestUrl.searchParams.get("image");

				if (!imageParameter) {
					return new Response("Missing image.", { status: 400 });
				}

				let imageUrl: URL;
				try {
					imageUrl = new URL(imageParameter, requestUrl.origin);
				} catch {
					return new Response("Invalid image.", { status: 400 });
				}

				if (imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") {
					return new Response("Invalid image.", { status: 400 });
				}
				if (!isAllowedImageUrl(imageUrl, requestUrl)) {
					return new Response("Invalid image.", { status: 400 });
				}

				let imageResponse: Response;
				try {
					imageResponse = await fetch(imageUrl, {
						signal: AbortSignal.timeout(3000),
					});
				} catch {
					return new Response("Image unavailable.", { status: 502 });
				}
				if (!imageResponse.ok) {
					return new Response("Image unavailable.", { status: 502 });
				}
				const contentLength = Number.parseInt(
					imageResponse.headers.get("content-length") ?? "",
					10,
				);
				if (
					!Number.isSafeInteger(contentLength) ||
					contentLength < 1 ||
					contentLength > MAX_IMAGE_BYTES
				) {
					return new Response("Image is too large.", { status: 413 });
				}

				const contentType = imageResponse.headers
					.get("content-type")
					?.split(";", 1)[0]
					.trim();
				if (!contentType?.startsWith("image/")) {
					return new Response("Invalid image.", { status: 400 });
				}

				const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
				if (imageBytes.byteLength > MAX_IMAGE_BYTES) {
					return new Response("Image is too large.", { status: 413 });
				}
				const imageData = `data:${contentType};base64,${toBase64(imageBytes)}`;
				const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><clipPath id="circle"><circle cx="32" cy="32" r="32" /></clipPath></defs>
<image href="${escapeXml(imageData)}" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#circle)" />
</svg>`;

				return new Response(svg, {
					headers: {
						"cache-control": "public, max-age=3600",
						"content-type": "image/svg+xml",
					},
				});
			},
		},
	},
});
