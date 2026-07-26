import type { AppEnv } from "@core/app-factory";
import { handleAuthRequest } from "@core/auth";
import { Hono } from "hono";

export const authController =
	new Hono<AppEnv>().on(
		["GET", "POST"],
		"/*",
		(c) => {
			const executionCtx = (() => {
				try {
					return c.executionCtx;
				} catch {
					// ponytail: app.request() does not provide ExecutionContext, but Better Auth only needs waitUntil when available.
					return {
						waitUntil: () => undefined,
					};
				}
			})();

			return handleAuthRequest(
				c.req.raw,
				c.env,
				executionCtx,
				c.get("db"),
			);
		},
	);
