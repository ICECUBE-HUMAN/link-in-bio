import { createFileRoute } from "@tanstack/react-router";
import {
	fetchBackend,
	getBackendRequestHeaders,
} from "@/lib/api/backend-client.server";

function forwardImageUpload(request: Request, handle: string, suffix = "") {
	const headers = getBackendRequestHeaders(request);

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
