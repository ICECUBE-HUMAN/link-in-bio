import * as v from "valibot";

/**
 * Public HTTP response contracts shared by the backend and its consumers.
 * Keep implementation details such as auth, database, and Cloudflare bindings
 * out of this package.
 */
export const healthResponseSchema = v.object({
	status: v.literal("ok"),
	timestamp: v.string(),
});

export type HealthResponse = v.InferOutput<typeof healthResponseSchema>;
