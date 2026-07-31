import type { AppEnv } from "@core/app-factory";
import {
	pageItemBatchRequestSchema,
	pageItemMetadataRequestSchema,
	pageItemUploadCompleteRequestSchema,
	pageItemUploadRequestSchema,
} from "@sinabro/api";
import type { Context } from "hono";
import { Hono } from "hono";
import * as v from "valibot";
import {
	UnauthorizedError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import {
	completeItemMediaUpload,
	createItemMediaUpload,
} from "../services/item-media.service";
import { enrichPageItemMetadata } from "../services/link-metadata.service";
import { assertOwnedPage } from "../services/page.service";
import {
	mapPageItemResponse,
	persistPageItemBatch,
} from "../services/page-item.service";

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

export const pageItemsController =
	new Hono<AppEnv>()
		.post(
			"/:handle/metadata",
			async (c) => {
				const user = c.get("user");
				if (!user)
					throw new UnauthorizedError();
				const parsed = v.safeParse(
					pageItemMetadataRequestSchema,
					await readJson(c),
				);
				if (!parsed.success)
					throw new UnprocessableEntityError(
						"Invalid link metadata request.",
						"INVALID_LINK_METADATA_REQUEST",
					);
				const item =
					await enrichPageItemMetadata({
						db: c.get("db"),
						handle:
							c.req.param("handle"),
						userId: user.id,
						itemId:
							parsed.output.itemId,
						url: parsed.output.url,
						publicBaseUrl:
							c.env?.R2_PUBLIC_URL,
						fetch: (input, init) =>
							fetch(input, init),
					});
				return c.json({
					item: mapPageItemResponse(
						item,
						c.env?.R2_PUBLIC_URL,
					),
				});
			},
		)
		.post(
			"/:handle/items/upload",
			async (c) => {
				const user = c.get("user");
				if (!user)
					throw new UnauthorizedError();
				const page =
					await assertOwnedPage(
						c.get("db"),
						c.req.param("handle"),
						user.id,
					);
				const parsed = v.safeParse(
					pageItemUploadRequestSchema,
					await readJson(c),
				);
				if (!parsed.success)
					throw new UnprocessableEntityError(
						"Invalid item media.",
						"INVALID_ITEM_MEDIA",
					);
				return c.json(
					await createItemMediaUpload({
						env: c.env,
						userId: user.id,
						pageId: page.id,
						input: parsed.output,
					}),
				);
			},
		)
		.post(
			"/:handle/items/upload/complete",
			async (c) => {
				const user = c.get("user");
				if (!user)
					throw new UnauthorizedError();
				const page =
					await assertOwnedPage(
						c.get("db"),
						c.req.param("handle"),
						user.id,
					);
				const parsed = v.safeParse(
					pageItemUploadCompleteRequestSchema,
					await readJson(c),
				);
				if (!parsed.success)
					throw new UnprocessableEntityError(
						"Invalid item media key.",
						"INVALID_ITEM_MEDIA",
					);
				return c.json(
					await completeItemMediaUpload(
						{
							env: c.env,
							userId: user.id,
							pageId: page.id,
							objectKey:
								parsed.output.objectKey,
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
				const parsed = v.safeParse(
					pageItemBatchRequestSchema,
					await readJson(c),
				);
				if (!parsed.success)
					throw new UnprocessableEntityError(
						"Invalid item batch.",
						"INVALID_ITEM_BATCH",
					);
				return c.json(
					await persistPageItemBatch({
						db: c.get("db"),
						handle:
							c.req.param("handle"),
						userId: user.id,
						batch: parsed.output,
						queue:
							c.env
								?.ITEM_MEDIA_DELETE_QUEUE,
						executionCtx: c.env
							?.ITEM_MEDIA_DELETE_QUEUE
							? c.executionCtx
							: undefined,
						publicBaseUrl:
							c.env?.R2_PUBLIC_URL,
					}),
				);
			},
		);
