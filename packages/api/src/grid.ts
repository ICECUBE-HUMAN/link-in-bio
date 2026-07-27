import * as v from "valibot";

export const itemTypeSchema = v.union([
	v.literal("text"),
	v.literal("media"),
	v.literal("map"),
	v.literal("section"),
	v.literal("link"),
]);

export type ItemType = v.InferOutput<typeof itemTypeSchema>;

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

const itemStyleSchema = v.record(v.string(), v.unknown());

const httpsUrlSchema = v.pipe(
	v.string(),
	v.trim(),
	v.url(),
	v.check((value) => value.startsWith("https://"), "HTTPS URL required."),
);

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
});

export const pageItemMapDataSchema = v.object({
	latitude: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
	longitude: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
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
});

export const pageItemLinkDataSchema = v.object({
	url: httpsUrlSchema,
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

const pageItemVariantSchema = v.variant("type", [
	v.object({ type: v.literal("text"), data: pageItemTextDataSchema }),
	v.object({ type: v.literal("media"), data: pageItemMediaDataSchema }),
	v.object({ type: v.literal("map"), data: pageItemMapDataSchema }),
	v.object({ type: v.literal("section"), data: pageItemSectionDataSchema }),
	v.object({ type: v.literal("link"), data: pageItemLinkDataSchema }),
]);

export const pageItemResponseSchema = v.intersect([
	pageItemResponseBaseSchema,
	pageItemVariantSchema,
]);

export type PageItemResponse = v.InferOutput<typeof pageItemResponseSchema>;

const pageItemUpsertBaseSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1)),
	style: itemStyleSchema,
	layouts: pageItemLayoutsSchema,
});

export const pageItemUpsertSchema = v.intersect([
	pageItemUpsertBaseSchema,
	pageItemVariantSchema,
]);

export type PageItemUpsert = v.InferOutput<typeof pageItemUpsertSchema>;

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
