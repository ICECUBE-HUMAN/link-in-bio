import { createFileRoute } from "@tanstack/react-router";
import { fetchBackend } from "@/lib/api/backend-client.server";

export const Route = createFileRoute(
	"/api/pages/$handle/image-upload/complete",
)({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				const headers = new Headers();
				const cookie = request.headers.get("cookie");
				const contentType = request.headers.get("content-type");

				if (cookie) headers.set("cookie", cookie);
				if (contentType) headers.set("content-type", contentType);

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
