import type { DatabaseClient } from "@db/index";
import { pages } from "@db/schema";
import {
	pageByHandleResponseSchema,
	pageHandleSchema,
} from "@sinabro/api";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { NotFoundError } from "../exceptions/http-exceptions";
import {
	mapPageResponse,
	mapPublicPageResponse,
} from "../mappers/page.mapper";
import {
	listPageItems,
	mapPageItemResponse,
} from "./page-item.service";

export const getPublicPage = async ({
	db,
	handle,
	publicBaseUrl,
	viewerUserId,
}: {
	db: DatabaseClient;
	handle: string;
	publicBaseUrl?: string;
	viewerUserId?: string | null;
}) => {
	const parsed = v.safeParse(
		pageHandleSchema,
		handle,
	);
	if (!parsed.success)
		throw new NotFoundError("Page");
	const page =
		await db.query.pages.findFirst({
			where: eq(
				pages.handle,
				parsed.output,
			),
		});
	if (!page)
		throw new NotFoundError("Page");
	return v.parse(
		pageByHandleResponseSchema,
		{
			page:
				viewerUserId === page.userId
					? mapPageResponse(page)
					: mapPublicPageResponse(page),
			items: (
				await listPageItems(db, page.id)
			).map((item) =>
				mapPageItemResponse(
					item,
					publicBaseUrl,
				),
			),
		},
	);
};
