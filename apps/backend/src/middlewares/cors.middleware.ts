import { cors } from "hono/cors";

export const corsMiddleware = cors({
	origin: (origin, c) => {
		return [
			c.env?.FRONTEND_URL,
			"http://localhost:3000",
		].includes(origin)
			? origin
			: undefined;
	},
	allowHeaders: [
		"Content-Type",
		"Authorization",
	],
	allowMethods: [
		"GET",
		"HEAD",
		"POST",
		"PUT",
		"PATCH",
		"DELETE",
		"OPTIONS",
	],
	exposeHeaders: ["Content-Length"],
	maxAge: 600,
	credentials: true,
});
