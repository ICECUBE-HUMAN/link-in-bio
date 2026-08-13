import * as v from "valibot";

export const billingPeriodSchema = v.picklist(["monthly", "yearly"]);

export const createCheckoutRequestSchema = v.object({
	period: billingPeriodSchema,
});

export type BillingPeriod = v.InferOutput<typeof billingPeriodSchema>;
