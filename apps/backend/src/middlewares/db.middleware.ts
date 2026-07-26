import { createDatabaseClient } from "@db/index";
import { createMiddleware } from "hono/factory";

export const dbMiddleware = createMiddleware(
	async (c, next) => {
		c.set(
			"db",
			createDatabaseClient(c.env),
		);

		await next();
	},
);
