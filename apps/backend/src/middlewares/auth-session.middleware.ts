import { getAuthSession } from "@core/auth";
import { createMiddleware } from "hono/factory";

export const authSessionMiddleware =
	createMiddleware(async (c, next) => {
		const authSession =
			await getAuthSession(
				c.req.raw.headers,
				c.env,
				c.get("db"),
			);

		c.set(
			"session",
			authSession?.session ?? null,
		);
		c.set(
			"user",
			authSession?.user ?? null,
		);

		await next();
	});
