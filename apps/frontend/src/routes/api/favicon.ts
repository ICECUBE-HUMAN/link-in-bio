import { createFileRoute } from "@tanstack/react-router";

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

				const imageResponse = await fetch(imageUrl);
				if (!imageResponse.ok) {
					return new Response("Image unavailable.", { status: 502 });
				}

				const contentType = imageResponse.headers
					.get("content-type")
					?.split(";", 1)[0]
					.trim();
				if (!contentType?.startsWith("image/")) {
					return new Response("Invalid image.", { status: 400 });
				}

				const imageData = `data:${contentType};base64,${toBase64(
					new Uint8Array(await imageResponse.arrayBuffer()),
				)}`;
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
