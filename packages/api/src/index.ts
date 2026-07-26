import * as v from "valibot";

export const reservedPageHandles = [
	"admin",
	"api",
	"auth",
	"check",
	"demo",
	"explore",
	"favicon",
	"health",
	"llms",
	"log-in",
	"login",
	"manifest",
	"new",
	"pages",
	"privacy",
	"robots",
	"settings",
	"sitemap",
	"terms",
	"update",
] as const;

const reservedPageHandleSet = new Set<string>(reservedPageHandles);

export const normalizePageHandle = (handle: string) =>
	handle.trim().toLowerCase();

export const isReservedPageHandle = (handle: string) =>
	reservedPageHandleSet.has(normalizePageHandle(handle));

export const pageHandleSchema = v.pipe(
	v.string(),
	v.trim(),
	v.toLowerCase(),
	v.minLength(3, "Handle must be at least 3 characters."),
	v.maxLength(30, "Handle must be at most 30 characters."),
	v.regex(
		/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
		"Handle can only include lowercase letters, numbers, and hyphens.",
	),
	v.check(
		(handle) => !handle.includes("--"),
		"Handle cannot include consecutive hyphens.",
	),
);

const optionalTextSchema = v.optional(v.pipe(v.string(), v.trim()));
const nullableTrimmedNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.maxLength(80, "Name must be at most 80 characters."),
	v.transform((value) => (value.length === 0 ? null : value)),
);
const nullableTrimmedBioSchema = v.pipe(
	v.string(),
	v.trim(),
	v.maxLength(500, "Text must be at most 500 characters."),
	v.transform((value) => (value.length === 0 ? null : value)),
);
const nullableTrimmedImageSchema = v.pipe(
	v.string(),
	v.trim(),
	v.transform((value) => (value.length === 0 ? null : value)),
);

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

export const createPageRequestSchema = v.object({
	handle: pageHandleSchema,
	name: v.nullable(nullableTrimmedNameSchema),
	bio: v.optional(
		v.pipe(
			v.string(),
			v.trim(),
			v.maxLength(500, "Bio must be at most 500 characters."),
		),
	),
	image: optionalTextSchema,
	role: optionalTextSchema,
});

export type CreatePageRequest = v.InferOutput<typeof createPageRequestSchema>;

export const updatePageRequestSchema = v.object({
	name: v.optional(v.nullable(nullableTrimmedNameSchema)),
	bio: v.optional(nullableTrimmedBioSchema),
	image: v.optional(nullableTrimmedImageSchema),
});

export type UpdatePageRequest = v.InferOutput<typeof updatePageRequestSchema>;

export const pageResponseSchema = v.object({
	id: v.string(),
	userId: v.string(),
	handle: pageHandleSchema,
	name: v.nullable(v.string()),
	bio: v.nullable(v.string()),
	image: v.nullable(v.string()),
	role: v.nullable(v.string()),
	createdAt: v.string(),
	updatedAt: v.string(),
});

export type PageResponse = v.InferOutput<typeof pageResponseSchema>;

export const createPageResponseSchema = v.object({
	page: pageResponseSchema,
});

export type CreatePageResponse = v.InferOutput<typeof createPageResponseSchema>;

export const updatePageResponseSchema = v.object({
	page: pageResponseSchema,
});

export type UpdatePageResponse = v.InferOutput<typeof updatePageResponseSchema>;

export const pageByHandleResponseSchema = v.object({
	page: pageResponseSchema,
});

export type PageByHandleResponse = v.InferOutput<
	typeof pageByHandleResponseSchema
>;

export const myPageResponseSchema = v.object({
	page: v.nullable(pageResponseSchema),
});

export type MyPageResponse = v.InferOutput<typeof myPageResponseSchema>;

export const profileImageUploadRequestSchema = v.object({
	contentType: v.pipe(
		v.string(),
		v.trim(),
		v.regex(/^image\/[a-z0-9.+-]+$/i),
	),
	size: v.pipe(
		v.number(),
		v.integer(),
		v.minValue(1),
	),
});

export type ProfileImageUploadRequest = v.InferOutput<
	typeof profileImageUploadRequestSchema
>;

export const profileImageUploadResponseSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	uploadUrl: v.pipe(v.string(), v.url()),
	expiresAt: v.string(),
});

export type ProfileImageUploadResponse = v.InferOutput<
	typeof profileImageUploadResponseSchema
>;

export const profileImageCompleteRequestSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
});

export type ProfileImageCompleteRequest = v.InferOutput<
	typeof profileImageCompleteRequestSchema
>;

export const profileImageCompleteResponseSchema = updatePageResponseSchema;
export type ProfileImageCompleteResponse = UpdatePageResponse;

export const handleAvailabilityQuerySchema = v.object({
	handle: pageHandleSchema,
});

export type HandleAvailabilityQuery = v.InferOutput<
	typeof handleAvailabilityQuerySchema
>;

export const handleAvailabilityReasonSchema = v.union([
	v.literal("invalid"),
	v.literal("reserved"),
	v.literal("taken"),
	v.null(),
]);

export const handleAvailabilityResponseSchema = v.object({
	handle: v.string(),
	available: v.boolean(),
	reason: handleAvailabilityReasonSchema,
});

export type HandleAvailabilityResponse = v.InferOutput<
	typeof handleAvailabilityResponseSchema
>;
