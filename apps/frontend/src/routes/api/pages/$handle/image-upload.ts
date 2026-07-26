import { createFileRoute } from "@tanstack/react-router";
import { fetchBackend } from "@/lib/api/backend-client.server";

function forwardImageUpload(request: Request, handle: string, suffix = "") {
	const headers = new Headers();
	const cookie = request.headers.get("cookie");
	const contentType = request.headers.get("content-type");

	if (cookie) headers.set("cookie", cookie);
	if (contentType) headers.set("content-type", contentType);

	return fetchBackend(
		`/pages/${encodeURIComponent(handle)}/image-upload${suffix}`,
		{
			method: "POST",
			headers,
			body: request.body,
		},
	);
}

export const Route = createFileRoute("/api/pages/$handle/image-upload")({
	server: {
		handlers: {
			POST: async ({ request, params }) =>
				forwardImageUpload(request, params.handle),
		},
	},
});
