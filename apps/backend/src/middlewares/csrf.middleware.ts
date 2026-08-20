import { csrf } from "hono/csrf";

export const csrfMiddleware = csrf({
	origin: (origin, c) =>
		[
			c.env?.FRONTEND_URL,
			"http://localhost:3000",
			"https://v2.grabbin.me",
		].includes(origin),
});
