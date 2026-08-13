import { createFileRoute } from "@tanstack/react-router";
import {
	fetchBackend,
	getBackendRequestHeaders,
} from "@/lib/api/backend-client.server";

export const Route = createFileRoute("/api/pages/$handle")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const headers = getBackendRequestHeaders(request);

				return fetchBackend(`/pages/${encodeURIComponent(params.handle)}`, {
					method: "PATCH",
					headers,
					body: request.body,
				});
			},
		},
	},
});
