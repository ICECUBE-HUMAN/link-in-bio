import { createFileRoute } from "@tanstack/react-router";
import { fetchBackend } from "@/lib/api/backend-client.server";

export const Route = createFileRoute("/api/pages/$handle/items/upload")({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				const headers = new Headers();
				const cookie = request.headers.get("cookie");
				if (cookie) headers.set("cookie", cookie);
				headers.set("content-type", "application/json");
				return fetchBackend(
					`/pages/${encodeURIComponent(params.handle)}/items/upload`,
					{ method: "POST", headers, body: request.body },
				);
			},
		},
	},
});
