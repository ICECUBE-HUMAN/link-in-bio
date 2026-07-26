import { csrf } from "hono/csrf";

export const csrfMiddleware = csrf({
	origin: (origin, c) =>
		[
			c.env?.FRONTEND_URL,
			"http://localhost:3000",
		].includes(origin),
});
