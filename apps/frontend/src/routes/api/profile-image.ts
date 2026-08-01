import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isAllowedImageUrl(imageUrl: URL) {
	if (!env.VITE_R2_PUBLIC_URL) return false;

	try {
		const publicBaseUrl = new URL(env.VITE_R2_PUBLIC_URL);
		const basePath = publicBaseUrl.pathname.replace(/\/+$/, "");
		return (
			imageUrl.origin === publicBaseUrl.origin &&
			(imageUrl.pathname === basePath ||
				imageUrl.pathname.startsWith(`${basePath}/`))
		);
	} catch {
		return false;
	}
}

export const Route = createFileRoute("/api/profile-image")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const requestUrl = new URL(request.url);
				const imageParameter = requestUrl.searchParams.get("url");
				if (!imageParameter) {
					return new Response("Missing image URL.", { status: 400 });
				}

				let imageUrl: URL;
				try {
					imageUrl = new URL(imageParameter);
				} catch {
					return new Response("Invalid image URL.", { status: 400 });
				}

				if (
					(imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") ||
					!isAllowedImageUrl(imageUrl)
				) {
					return new Response("Invalid image URL.", { status: 400 });
				}

				let imageResponse: Response;
				try {
					imageResponse = await fetch(imageUrl, {
						signal: AbortSignal.timeout(5000),
					});
				} catch {
					return new Response("Image unavailable.", { status: 502 });
				}

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

				const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
				if (
					imageBytes.byteLength < 1 ||
					imageBytes.byteLength > MAX_IMAGE_BYTES
				) {
					return new Response("Image is too large.", { status: 413 });
				}

				return new Response(imageBytes, {
					headers: {
						"cache-control": "private, max-age=300",
						"content-length": String(imageBytes.byteLength),
						"content-type": contentType,
					},
				});
			},
		},
	},
});
