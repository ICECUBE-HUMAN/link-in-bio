import type { AppEnv } from "@core/app-factory";
import {
	buildBillingStatus,
	PRO_MONTHLY_PRODUCT_ID,
	PRO_YEARLY_PRODUCT_ID,
} from "@core/billing";
import { createCreemClient } from "@creem_io/better-auth/server";
import { creemSubscription } from "@db/schema";
import { createCheckoutRequestSchema } from "@sinabro/api";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import {
	UnauthorizedError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";

const CREEM_PRODUCT_IDS = {
	monthly: PRO_MONTHLY_PRODUCT_ID,
	yearly: PRO_YEARLY_PRODUCT_ID,
} as const;

type CreateCheckoutInput = {
	productId: string;
	email: string;
	referenceId: string;
};

export type CreateCheckout = (
	env: AppEnv["Bindings"],
	input: CreateCheckoutInput,
) => Promise<{ url: string }>;

const createCreemCheckout: CreateCheckout =
	async (
		env,
		{ productId, email, referenceId },
	) => {
		const creem = createCreemClient({
			apiKey: env.CREEM_API_KEY,
			testMode:
				env.CREEM_TEST_MODE === "true",
		});

		const checkout =
			await creem.checkouts.create({
				productId,
				customer: { email },
				successUrl:
					env.CREEM_SUCCESS_URL,
				metadata: { referenceId },
			});

		return {
			url: checkout.checkoutUrl,
		};
	};

export const createBillingController = (
	createCheckout: CreateCheckout = createCreemCheckout,
) =>
	new Hono<AppEnv>()
		.get("/status", async (c) => {
			const user = c.get("user");
			if (!user)
				throw new UnauthorizedError();

			const subscriptions = await c
				.get("db")
				.query.creemSubscription.findMany(
					{
						where: eq(
							creemSubscription.referenceId,
							user.id,
						),
						orderBy: [
							desc(
								creemSubscription.periodEnd,
							),
						],
					},
				);

			return c.json(
				buildBillingStatus(
					subscriptions,
				),
			);
		})
		.post("/checkout", async (c) => {
			const user = c.get("user");
			if (!user)
				throw new UnauthorizedError();

			const parsed = v.safeParse(
				createCheckoutRequestSchema,
				await c.req.json(),
			);
			if (!parsed.success)
				throw new UnprocessableEntityError(
					"Invalid billing period.",
					"INVALID_BILLING_PERIOD",
				);

			const productId =
				CREEM_PRODUCT_IDS[
					parsed.output.period
				];

			try {
				return c.json(
					await createCheckout(c.env, {
						productId,
						email: user.email,
						referenceId: user.id,
					}),
				);
			} catch (error) {
				console.error(
					"[billing] Creem checkout failed",
					error,
				);
				throw new HTTPException(502, {
					message:
						"Billing provider checkout failed.",
				});
			}
		});

export const billingController =
	createBillingController();
