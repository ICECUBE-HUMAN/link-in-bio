import {
	describe,
	expect,
	it,
} from "bun:test";
import type { AppEnv } from "@core/app-factory";
import { Hono } from "hono";
import { createBillingController } from "./billing.controller";

const appWith = (
	user: AppEnv["Variables"]["user"],
	rows: unknown[] = [],
	createCheckout?: Parameters<
		typeof createBillingController
	>[0],
) => {
	const app = new Hono<AppEnv>();
	app.use("*", async (c, next) => {
		c.set("user", user);
		c.set("db", {
			query: {
				creemSubscription: {
					findMany: async () => rows,
				},
			},
		} as never);
		await next();
	});
	return app.route(
		"/billing",
		createBillingController(
			createCheckout,
		),
	);
};

describe("billing controller", () => {
	it("rejects anonymous status requests", async () => {
		const response = await appWith(
			null,
		).request(
			"http://localhost/billing/status",
		);

		expect(response.status).toBe(401);
	});

	it("returns the authenticated user's subscription status", async () => {
		const response = await appWith(
			{ id: "user_1" } as never,
			[
				{
					status: "active",
					periodStart: new Date(
						"2026-08-01T00:00:00Z",
					),
					periodEnd: new Date(
						"2026-09-01T00:00:00Z",
					),
					productId: "prod_10k",
					cancelAtPeriodEnd: false,
				},
			],
		).request(
			"http://localhost/billing/status",
		);

		expect(response.status).toBe(200);
		expect(
			await response.json(),
		).toMatchObject({
			status: "active",
			hasAccess: true,
			productId: "prod_10k",
		});
	});

	it.each([
		[
			"monthly",
			"prod_1M7K6uOQxjMu006ypD04R",
		],
		[
			"yearly",
			"prod_6oaKuPlsztLLAQt3Y5BlqD",
		],
	] as const)("creates checkout from %s without accepting a product id", async (period, productId) => {
		let received: unknown;
		const response = await appWith(
			{
				id: "user_1",
				email: "user@example.com",
			} as never,
			[],
			async (_env, input) => {
				received = input;
				return {
					url: "https://checkout.example",
				};
			},
		).request(
			"http://localhost/billing/checkout",
			{
				method: "POST",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					period,
					productId:
						"prod_attacker-controlled",
				}),
			},
		);

		expect(response.status).toBe(200);
		expect(received).toEqual({
			productId,
			email: "user@example.com",
			referenceId: "user_1",
		});
		expect(
			await response.json(),
		).toEqual({
			url: "https://checkout.example",
		});
	});

	it("rejects an unsupported billing period", async () => {
		const response = await appWith(
			{ id: "user_1" } as never,
			[],
		).request(
			"http://localhost/billing/checkout",
			{
				method: "POST",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					period: "weekly",
				}),
			},
		);

		expect(response.status).toBe(422);
	});

	it("does not expose direct subscription changes", async () => {
		const response = await appWith(
			{ id: "user_1" } as never,
			[
				{
					productId:
						"prod_6oaKuPlsztLLAQt3Y5BlqD",
					status: "active",
					periodEnd: new Date(
						"2026-09-01T00:00:00Z",
					),
					creemSubscriptionId: "sub_1",
				},
			],
		).request(
			"http://localhost/billing/change-plan",
			{
				method: "POST",
				headers: {
					"content-type":
						"application/json",
				},
				body: JSON.stringify({
					period: "monthly",
				}),
			},
		);

		expect(response.status).toBe(404);
	});
});
