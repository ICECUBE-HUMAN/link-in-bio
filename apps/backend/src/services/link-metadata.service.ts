import {
	createInitialLinkMetadata,
	type PageItemLinkMetadata,
	type PageItemUpsert,
	pageItemLinkDataSchema,
} from "@sinabro/api";

export {
	createInitialLinkMetadata,
	normalizeLinkUrl,
} from "@sinabro/api";

import type { DatabaseClient } from "@db/index";
import { pageItems } from "@db/schema";
import { and, eq } from "drizzle-orm";
import * as v from "valibot";
import {
	NotFoundError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import { resolveLinkProvider } from "./link-providers";
import { assertOwnedPage } from "./page.service";

export function prepareLinkItem(
	item: Extract<
		PageItemUpsert,
		{ type: "link" }
	>,
	current?: typeof pageItems.$inferSelect,
) {
	const currentData =
		current?.type === "link"
			? v.safeParse(
					pageItemLinkDataSchema,
					current.data,
				)
			: null;
	const sameUrl =
		currentData?.success &&
		currentData.output.url ===
			item.data.url;
	const initialMetadata =
		createInitialLinkMetadata(
			item.data.url,
		);
	const metadata = sameUrl
		? {
				...(currentData.success
					? currentData.output.metadata
					: undefined),
				...item.data.metadata,
			}
		: {
				...item.data.metadata,
				...initialMetadata,
			};

	return {
		...item,
		data: {
			...item.data,
			metadata,
		},
	};
}

function mergeMetadata(
	current:
		| PageItemLinkMetadata
		| undefined,
	enriched: PageItemLinkMetadata,
): PageItemLinkMetadata {
	return Object.fromEntries(
		Object.entries({
			...current,
			...enriched,
		}).filter(
			([, value]) =>
				value !== undefined,
		),
	) as PageItemLinkMetadata;
}

export async function enrichPageItemMetadata({
	db,
	handle,
	userId,
	itemId,
	url,
	fetch,
}: {
	db: DatabaseClient;
	handle: string;
	userId: string;
	itemId: string;
	url: string;
	fetch: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response>;
}) {
	const page = await assertOwnedPage(
		db,
		handle,
		userId,
	);
	const current =
		await db.query.pageItems.findFirst({
			where: and(
				eq(pageItems.id, itemId),
				eq(pageItems.pageId, page.id),
			),
		});
	if (!current)
		throw new NotFoundError("Item");
	if (current.type !== "link")
		throw new UnprocessableEntityError(
			"Item is not a link.",
			"NOT_LINK_ITEM",
		);

	const currentData = v.parse(
		pageItemLinkDataSchema,
		current.data,
	);
	if (currentData.url !== url)
		throw new UnprocessableEntityError(
			"Link URL changed before metadata completed.",
			"STALE_LINK_METADATA",
		);

	const provider = resolveLinkProvider(
		new URL(url),
	);
	const enriched =
		await provider.enrich(
			new URL(url),
			{ fetch },
		);
	const data = {
		...currentData,
		metadata: mergeMetadata(
			currentData.metadata,
			enriched,
		),
	};
	data.metadata = mergeMetadata(
		data.metadata,
		{
			provider: provider.id,
		},
	);
	await db
		.update(pageItems)
		.set({
			data,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(pageItems.id, itemId),
				eq(pageItems.pageId, page.id),
			),
		);

	const updated =
		await db.query.pageItems.findFirst({
			where: and(
				eq(pageItems.id, itemId),
				eq(pageItems.pageId, page.id),
			),
		});
	if (!updated)
		throw new NotFoundError("Item");

	return updated;
}
