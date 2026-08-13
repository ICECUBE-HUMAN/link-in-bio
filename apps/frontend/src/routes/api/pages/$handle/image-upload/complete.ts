import { createFileRoute } from "@tanstack/react-router";
import {
	fetchBackend,
	getBackendRequestHeaders,
} from "@/lib/api/backend-client.server";

export const Route = createFileRoute(
	"/api/pages/$handle/image-upload/complete",
)({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				const headers = getBackendRequestHeaders(request);

				return fetchBackend(
					`/pages/${encodeURIComponent(params.handle)}/image-upload/complete`,
					{
						method: "POST",
						headers,
						body: request.body,
					},
				);
			},
		},
	},
});
