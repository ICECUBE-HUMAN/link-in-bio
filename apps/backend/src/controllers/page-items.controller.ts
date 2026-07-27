import type { AppEnv } from "@core/app-factory";
import type { DatabaseClient } from "@db/index";
import {
	pageItems,
	pages,
} from "@db/schema";
import {
	type PageItemResponse,
	type PageItemUpsert,
	pageHandleSchema,
	pageItemBatchRequestSchema,
	pageItemBatchResponseSchema,
	pageItemResponseSchema,
	pageItemUploadCompleteRequestSchema,
	pageItemUploadCompleteResponseSchema,
	pageItemUploadRequestSchema,
	pageItemUploadResponseSchema,
} from "@sinabro/api";
import {
	getAllowedPresets,
	getPresetGeometry,
	validateLayout,
} from "@sinabro/grid-layout";
import {
	and,
	eq,
	inArray,
	sql,
} from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import * as v from "valibot";
import {
	createItemMediaKey,
	createItemMediaUploadUrl,
	getItemMediaUrl,
	isItemMediaKey,
	MAX_ITEM_MEDIA_SIZE,
	validateItemMediaUpload,
} from "../core/r2";
import {
	NotFoundError,
	UnauthorizedError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import {
	itemTypeRegistry,
	validatePageItemData,
} from "../models/item.model";

const getPublicR2Url = (
	c: Context<AppEnv>,
) =>
	(
		c.env as
			| (typeof c.env & {
					R2_PUBLIC_URL?: string;
			  })
			| undefined
	)?.R2_PUBLIC_URL;

const readJson = async (
	c: Context<AppEnv>,
) => {
	try {
		return await c.req.json();
	} catch {
		throw new UnprocessableEntityError(
			"Invalid JSON payload.",
			"INVALID_JSON_PAYLOAD",
		);
	}
};

export const mapPageItemResponse = (
	item: typeof pageItems.$inferSelect,
	publicBaseUrl?: string,
): PageItemResponse => {
	const data = {
		...item.data,
	} as Record<string, unknown>;
	if (
		item.type === "media" &&
		typeof data.objectKey === "string"
	) {
		const mediaUrl = getItemMediaUrl(
			publicBaseUrl,
			data.objectKey,
		);
		if (mediaUrl)
			data.mediaUrl = mediaUrl;
	}

	return v.parse(
		pageItemResponseSchema,
		{
			id: item.id,
			type: item.type,
			data,
			style: item.style,
			layouts: item.layouts,
			createdAt:
				item.createdAt.toISOString(),
			updatedAt:
				item.updatedAt.toISOString(),
		},
	);
};

export const listPageItems = async (
	db: AppEnv["Variables"]["db"],
	pageId: string,
) =>
	db.query.pageItems.findMany({
		where: eq(pageItems.pageId, pageId),
		orderBy: (item, { asc }) => [
			asc(item.createdAt),
			asc(item.id),
		],
	});

const assertPage = async (
	db: DatabaseClient,
	handle: string,
	userId: string,
) => {
	const parsedHandle = v.safeParse(
		pageHandleSchema,
		handle,
	);
	if (!parsedHandle.success)
		throw new NotFoundError("Page");
	const page =
		await db.query.pages.findFirst({
			where: and(
				eq(
					pages.handle,
					parsedHandle.output,
				),
				eq(pages.userId, userId),
			),
		});
	if (!page)
		throw new NotFoundError("Page");
	return page;
};

const parseBatch = async (
	c: Context<AppEnv>,
) => {
	const parsed = v.safeParse(
		pageItemBatchRequestSchema,
		await readJson(c),
	);
	if (!parsed.success) {
		throw new UnprocessableEntityError(
			"Invalid item batch.",
			"INVALID_ITEM_BATCH",
		);
	}
	return parsed.output;
};

const assertUniqueBatchIds = (
	batch: Awaited<
		ReturnType<typeof parseBatch>
	>,
) => {
	const upsertIds = new Set<string>();
	for (const item of batch.upserts) {
		if (upsertIds.has(item.id))
			throw new UnprocessableEntityError(
				"Item IDs must be unique.",
				"DUPLICATE_ITEM_ID",
			);
		upsertIds.add(item.id);
	}
	for (const id of batch.deletes) {
		if (upsertIds.has(id))
			throw new UnprocessableEntityError(
				"An item cannot be deleted and upserted in the same batch.",
				"CONFLICTING_ITEM_OPERATION",
			);
		upsertIds.add(id);
	}
};

const assertItemPayload = (
	item: PageItemUpsert,
	userId: string,
) => {
	try {
		validatePageItemData(
			item.type,
			item.data,
		);
		if (
			!(item.type in itemTypeRegistry)
		)
			throw new Error(
				"Unknown item type",
			);
		for (const [
			breakpoint,
			layout,
		] of Object.entries(
			item.layouts,
		) as Array<
			[
				"wide" | "compact",
				typeof item.layouts.wide,
			]
		>) {
			const cols =
				breakpoint === "wide" ? 4 : 2;
			validateLayout(
				{ [item.id]: layout },
				cols,
			);
			const presetMatches =
				getAllowedPresets(
					item.type,
				).some(
					(preset) =>
						getPresetGeometry(
							preset,
							breakpoint,
						).w === layout.w &&
						getPresetGeometry(
							preset,
							breakpoint,
						).h === layout.h,
				);
			if (!presetMatches)
				throw new Error(
					"Unsupported preset",
				);
		}
		if (
			item.type === "media" &&
			(!isItemMediaKey(
				item.data.objectKey,
			) ||
				!item.data.objectKey.startsWith(
					`users/${userId}/`,
				))
		) {
			throw new Error(
				"Invalid media object key",
			);
		}
	} catch {
		throw new UnprocessableEntityError(
			"Invalid item payload.",
			"INVALID_ITEM_PAYLOAD",
		);
	}
};

export const pageItemsController =
	new Hono<AppEnv>()
		.post(
			"/:handle/items/upload",
			async (c) => {
				const user = c.get("user");
				if (!user)
					throw new UnauthorizedError();
				await assertPage(
					c.get("db"),
					c.req.param("handle"),
					user.id,
				);
				const parsed = v.safeParse(
					pageItemUploadRequestSchema,
					await readJson(c),
				);
				if (
					!parsed.success ||
					parsed.output.size >
						MAX_ITEM_MEDIA_SIZE ||
					!validateItemMediaUpload(
						parsed.output,
					)
				) {
					throw new UnprocessableEntityError(
						"Invalid item media.",
						"INVALID_ITEM_MEDIA",
					);
				}
				const objectKey =
					createItemMediaKey({
						...parsed.output,
						userId: user.id,
					});
				if (!objectKey)
					throw new UnprocessableEntityError(
						"Invalid media filename.",
						"INVALID_ITEM_MEDIA",
					);
				return c.json(
					v.parse(
						pageItemUploadResponseSchema,
						await createItemMediaUploadUrl(
							{
								accountId:
									c.env.R2_ACCOUNT_ID,
								accessKeyId:
									c.env
										.R2_ACCESS_KEY_ID,
								secretAccessKey:
									c.env
										.R2_SECRET_ACCESS_KEY,
								objectKey,
								contentType:
									parsed.output
										.contentType,
							},
						),
					),
				);
			},
		)
		.post(
			"/:handle/items/upload/complete",
			async (c) => {
				const user = c.get("user");
				if (!user)
					throw new UnauthorizedError();
				await assertPage(
					c.get("db"),
					c.req.param("handle"),
					user.id,
				);
				const parsed = v.safeParse(
					pageItemUploadCompleteRequestSchema,
					await readJson(c),
				);
				const objectKey = parsed.success
					? parsed.output.objectKey
					: "";
				if (
					!parsed.success ||
					!isItemMediaKey(objectKey) ||
					!objectKey.startsWith(
						`users/${user.id}/`,
					)
				) {
					throw new UnprocessableEntityError(
						"Invalid item media key.",
						"INVALID_ITEM_MEDIA",
					);
				}
				const uploadedObject =
					await c.env.IMAGES.head(
						objectKey,
					);
				const contentType =
					uploadedObject?.httpMetadata
						?.contentType ?? "";
				if (
					!uploadedObject ||
					uploadedObject.size >
						MAX_ITEM_MEDIA_SIZE ||
					!/^(image|video)\//i.test(
						contentType,
					)
				) {
					throw new UnprocessableEntityError(
						"Uploaded item media was not found.",
						"ITEM_MEDIA_NOT_FOUND",
					);
				}
				return c.json(
					v.parse(
						pageItemUploadCompleteResponseSchema,
						{
							objectKey,
							mimeType: contentType,
							size: uploadedObject.size,
						},
					),
				);
			},
		)
		.patch(
			"/:handle/batch",
			async (c) => {
				const user = c.get("user");
				if (!user)
					throw new UnauthorizedError();
				const batch =
					await parseBatch(c);
				assertUniqueBatchIds(batch);
				const deletedMediaKeys: string[] =
					[];
				const response = await c
					.get("db")
					.transaction(async (tx) => {
						const page =
							await assertPage(
								tx as unknown as DatabaseClient,
								c.req.param("handle"),
								user.id,
							);
						const existing =
							await tx.query.pageItems.findMany(
								{
									where: eq(
										pageItems.pageId,
										page.id,
									),
								},
							);
						const requestedIds = [
							...new Set(
								batch.upserts.map(
									(item) => item.id,
								),
							),
						];
						if (requestedIds.length) {
							const claimedItems =
								await tx.query.pageItems.findMany(
									{
										where: inArray(
											pageItems.id,
											requestedIds,
										),
										columns: {
											id: true,
											pageId: true,
										},
									},
								);
							if (
								claimedItems.some(
									(item) =>
										item.pageId !==
										page.id,
								)
							)
								throw new UnprocessableEntityError(
									"Item ID is already used by another page.",
									"ITEM_ID_ALREADY_CLAIMED",
								);
						}
						const existingById =
							new Map(
								existing.map((item) => [
									item.id,
									item,
								]),
							);
						for (const item of batch.upserts) {
							assertItemPayload(
								item,
								user.id,
							);
							const current =
								existingById.get(
									item.id,
								);
							if (
								current &&
								current.type !==
									item.type
							) {
								throw new UnprocessableEntityError(
									"Item type cannot change.",
									"ITEM_TYPE_IMMUTABLE",
								);
							}
							if (
								current &&
								current.pageId !==
									page.id
							)
								throw new NotFoundError(
									"Item",
								);
						}
						for (const id of batch.deletes)
							if (!existingById.has(id))
								throw new NotFoundError(
									"Item",
								);
						for (const breakpoint of [
							"wide",
							"compact",
						] as const) {
							const layouts =
								Object.fromEntries(
									existing
										.filter(
											(item) =>
												!batch.deletes.includes(
													item.id,
												),
										)
										.map((item) => {
											const update =
												batch.upserts.find(
													(candidate) =>
														candidate.id ===
														item.id,
												);
											return [
												item.id,
												update?.layouts[
													breakpoint
												] ??
													item.layouts[
														breakpoint
													],
											];
										}),
								) as Record<
									string,
									{
										x: number;
										y: number;
										w: number;
										h: number;
									}
								>;
							for (const item of batch.upserts)
								if (
									!existingById.has(
										item.id,
									)
								)
									layouts[item.id] =
										item.layouts[
											breakpoint
										];
							try {
								validateLayout(
									layouts,
									breakpoint === "wide"
										? 4
										: 2,
								);
							} catch {
								throw new UnprocessableEntityError(
									"Items may not overlap or exceed the grid.",
									"INVALID_ITEM_LAYOUT",
								);
							}
						}
						if (batch.deletes.length)
							await tx
								.delete(pageItems)
								.where(
									and(
										eq(
											pageItems.pageId,
											page.id,
										),
										inArray(
											pageItems.id,
											batch.deletes,
										),
									),
								);
						for (const item of existing.filter(
							(candidate) =>
								batch.deletes.includes(
									candidate.id,
								),
						)) {
							if (
								item.type === "media" &&
								typeof item.data
									.objectKey ===
									"string"
							)
								deletedMediaKeys.push(
									item.data.objectKey,
								);
						}
						for (const item of batch.upserts) {
							const current =
								existingById.get(
									item.id,
								);
							if (
								current?.type ===
									"media" &&
								item.type === "media" &&
								typeof current.data
									.objectKey ===
									"string" &&
								current.data
									.objectKey !==
									item.data.objectKey &&
								isItemMediaKey(
									current.data
										.objectKey,
								) &&
								current.data.objectKey.startsWith(
									`users/${user.id}/`,
								)
							)
								deletedMediaKeys.push(
									current.data
										.objectKey,
								);
						}
						if (batch.upserts.length)
							await tx
								.insert(pageItems)
								.values(
									batch.upserts.map(
										(item) => ({
											id: item.id,
											pageId: page.id,
											type: item.type,
											data: item.data,
											style: item.style,
											layouts:
												item.layouts,
										}),
									),
								)
								.onConflictDoUpdate({
									target: pageItems.id,
									set: {
										type: sql`excluded.type`,
										data: sql`excluded.data`,
										style: sql`excluded.style`,
										layouts: sql`excluded.layouts`,
										updatedAt:
											new Date(),
									},
								});
						const changedIds = [
							...new Set([
								...batch.deletes,
								...batch.upserts.map(
									(item) => item.id,
								),
							]),
						];
						const changed =
							changedIds.length
								? await tx.query.pageItems.findMany(
										{
											where: and(
												eq(
													pageItems.pageId,
													page.id,
												),
												inArray(
													pageItems.id,
													changedIds,
												),
											),
											orderBy: (
												item,
												{ asc },
											) => [
												asc(
													item.createdAt,
												),
												asc(item.id),
											],
										},
									)
								: [];
						return { items: changed };
					});
				const queue =
					c.env
						?.ITEM_MEDIA_DELETE_QUEUE;
				if (
					queue &&
					deletedMediaKeys.length
				) {
					c.executionCtx.waitUntil(
						queue.sendBatch(
							deletedMediaKeys.map(
								(objectKey) => ({
									body: { objectKey },
								}),
							),
						),
					);
				}
				return c.json(
					v.parse(
						pageItemBatchResponseSchema,
						{
							items: response.items.map(
								(item) =>
									mapPageItemResponse(
										item,
										getPublicR2Url(c),
									),
							),
						},
					),
				);
			},
		);
