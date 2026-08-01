import * as v from "valibot";

export const itemTypeSchema = v.union([
	v.literal("text"),
	v.literal("media"),
	v.literal("map"),
	v.literal("section"),
	v.literal("link"),
]);

export type ItemType = v.InferOutput<typeof itemTypeSchema>;

export const MAX_ITEM_MEDIA_SIZE = 3 * 1024 * 1024;
export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
export const ITEM_MEDIA_ACCEPT =
	".avif,.gif,.jpg,.jpeg,.png,.webp,.bmp,.svg,.mp4,.webm,.mov,.m4v,.avi";

export const breakpointSchema = v.union([
	v.literal("wide"),
	v.literal("compact"),
]);

export type Breakpoint = v.InferOutput<typeof breakpointSchema>;

export const itemLayoutSchema = v.object({
	x: v.pipe(v.number(), v.integer(), v.minValue(0)),
	y: v.pipe(v.number(), v.integer(), v.minValue(0)),
	w: v.pipe(v.number(), v.integer(), v.minValue(1)),
	h: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type ItemLayout = v.InferOutput<typeof itemLayoutSchema>;

const itemStyleSchema = v.record(
	v.string(),
	v.union([v.string(), v.number(), v.boolean(), v.null()]),
);

const httpsUrlSchema = v.pipe(
	v.string(),
	v.trim(),
	v.url(),
	v.check((value) => value.startsWith("https://"), "HTTPS URL required."),
);

const mailtoUrlSchema = v.pipe(
	v.string(),
	v.trim(),
	v.check((value) => {
		try {
			const url = new URL(value);
			return url.protocol === "mailto:" && url.pathname.includes("@");
		} catch {
			return false;
		}
	}, "Valid mailto URL required."),
);

export const pageItemLinkUrlSchema = v.union([httpsUrlSchema, mailtoUrlSchema]);

export const pageItemTextDataSchema = v.object({
	text: v.pipe(v.string(), v.trim()),
	link: v.optional(httpsUrlSchema),
});

export const pageItemMediaDataSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	mimeType: v.pipe(
		v.string(),
		v.regex(/^(image|video)\/[a-z0-9.+-]+$/i, "Media MIME type required."),
	),
	caption: v.optional(v.string()),
	link: v.optional(httpsUrlSchema),
});

export const pageItemMediaResponseDataSchema = v.object({
	...pageItemMediaDataSchema.entries,
	mediaUrl: v.optional(httpsUrlSchema),
});

export const pageItemMapDataSchema = v.object({
	latitude: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
	longitude: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
	zoom: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(22))),
	caption: v.optional(v.string()),
});

export const pageItemSectionDataSchema = v.object({
	title: v.pipe(v.string(), v.trim()),
});

export const pageItemLinkMetadataSchema = v.object({
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	faviconUrl: v.optional(httpsUrlSchema),
	imageUrl: v.optional(httpsUrlSchema),
	provider: v.optional(v.string()),
	providerData: v.optional(
		v.record(
			v.string(),
			v.union([
				v.string(),
				v.number(),
				v.boolean(),
				v.null(),
				v.array(httpsUrlSchema),
			]),
		),
	),
});

export type PageItemLinkMetadata = v.InferOutput<
	typeof pageItemLinkMetadataSchema
>;

export const pageItemLinkDataSchema = v.object({
	url: pageItemLinkUrlSchema,
	metadata: v.optional(pageItemLinkMetadataSchema),
});

export const pageItemDataSchemas = {
	text: pageItemTextDataSchema,
	media: pageItemMediaDataSchema,
	map: pageItemMapDataSchema,
	section: pageItemSectionDataSchema,
	link: pageItemLinkDataSchema,
} as const;

export const pageItemLayoutsSchema = v.object({
	wide: itemLayoutSchema,
	compact: itemLayoutSchema,
});

export type PageItemLayouts = v.InferOutput<typeof pageItemLayoutsSchema>;

const pageItemResponseBaseSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	style: itemStyleSchema,
	layouts: pageItemLayoutsSchema,
	createdAt: v.string(),
	updatedAt: v.string(),
});

const pageItemResponseVariantSchema = v.variant("type", [
	v.object({ type: v.literal("text"), data: pageItemTextDataSchema }),
	v.object({ type: v.literal("media"), data: pageItemMediaResponseDataSchema }),
	v.object({ type: v.literal("map"), data: pageItemMapDataSchema }),
	v.object({ type: v.literal("section"), data: pageItemSectionDataSchema }),
	v.object({ type: v.literal("link"), data: pageItemLinkDataSchema }),
]);

export const pageItemResponseSchema = v.intersect([
	pageItemResponseBaseSchema,
	pageItemResponseVariantSchema,
]);

export type PageItemResponse = v.InferOutput<typeof pageItemResponseSchema>;

const pageItemUpsertBaseSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	style: itemStyleSchema,
	layouts: pageItemLayoutsSchema,
});

export const pageItemUpsertSchema = v.intersect([
	pageItemUpsertBaseSchema,
	v.variant("type", [
		v.object({ type: v.literal("text"), data: pageItemTextDataSchema }),
		v.object({ type: v.literal("media"), data: pageItemMediaDataSchema }),
		v.object({ type: v.literal("map"), data: pageItemMapDataSchema }),
		v.object({ type: v.literal("section"), data: pageItemSectionDataSchema }),
		v.object({ type: v.literal("link"), data: pageItemLinkDataSchema }),
	]),
]);

export type PageItemUpsert = v.InferOutput<typeof pageItemUpsertSchema>;

export function hasPageItemContent(item: PageItemUpsert): boolean {
	switch (item.type) {
		case "text":
			return item.data.text.trim().length > 0;
		case "section":
			return item.data.title.trim().length > 0;
		default:
			return true;
	}
}

export const pageItemBatchRequestSchema = v.object({
	upserts: v.array(pageItemUpsertSchema),
	deletes: v.array(v.pipe(v.string(), v.minLength(1))),
});

export type PageItemBatchRequest = v.InferOutput<
	typeof pageItemBatchRequestSchema
>;

export const pageItemBatchResponseSchema = v.object({
	items: v.array(pageItemResponseSchema),
});

export type PageItemBatchResponse = v.InferOutput<
	typeof pageItemBatchResponseSchema
>;

export const pageItemUploadRequestSchema = v.object({
	filename: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(180)),
	contentType: v.pipe(
		v.string(),
		v.trim(),
		v.regex(/^(image|video)\/[a-z0-9.+-]+$/i),
	),
	size: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type PageItemUploadRequest = v.InferOutput<
	typeof pageItemUploadRequestSchema
>;

export const pageItemUploadResponseSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	uploadUrl: v.pipe(v.string(), v.url()),
	expiresAt: v.string(),
});

export type PageItemUploadResponse = v.InferOutput<
	typeof pageItemUploadResponseSchema
>;

export const pageItemUploadCompleteRequestSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
});

export type PageItemUploadCompleteRequest = v.InferOutput<
	typeof pageItemUploadCompleteRequestSchema
>;

export const pageItemUploadCompleteResponseSchema = v.object({
	objectKey: v.pipe(v.string(), v.minLength(1)),
	mimeType: v.pipe(v.string(), v.regex(/^(image|video)\/[a-z0-9.+-]+$/i)),
	size: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export type PageItemUploadCompleteResponse = v.InferOutput<
	typeof pageItemUploadCompleteResponseSchema
>;
