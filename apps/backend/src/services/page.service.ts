import type { AuthUser } from "@core/auth";
import type { DatabaseClient } from "@db/index";
import {
	pages,
	user as userTable,
} from "@db/schema";
import {
	type CreatePageRequest,
	pageHandleSchema,
	type UpdatePageRequest,
} from "@sinabro/api";
import {
	and,
	eq,
	isNull,
} from "drizzle-orm";
import * as v from "valibot";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "../exceptions/http-exceptions";

const isUniqueHandleViolation = (
	error: unknown,
) => {
	if (
		typeof error !== "object" ||
		error === null
	)
		return false;
	const maybePgError = error as {
		code?: unknown;
		constraint?: unknown;
	};
	return (
		maybePgError.code === "23505" &&
		maybePgError.constraint ===
			"pages_handle_idx"
	);
};

export const getPrimaryPage = async ({
	db,
	userId,
	primaryPageId,
}: {
	db: DatabaseClient;
	userId: string;
	primaryPageId: string | null;
}) => {
	if (!primaryPageId) return null;
	return db.query.pages.findFirst({
		where: and(
			eq(pages.id, primaryPageId),
			eq(pages.userId, userId),
		),
	});
};

export const assertOwnedPage = async (
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

export const assertEligibleUser =
	async ({
		db,
		userId,
		sessionPrimaryPageId,
	}: {
		db: DatabaseClient;
		userId: string;
		sessionPrimaryPageId: string | null;
	}) => {
		if (sessionPrimaryPageId)
			throw new ForbiddenError(
				"Primary page already exists.",
				"PRIMARY_PAGE_ALREADY_EXISTS",
			);
		const currentUser =
			await db.query.user.findFirst({
				where: eq(userTable.id, userId),
			});
		if (!currentUser)
			throw new UnauthorizedError();
		if (currentUser.primaryPageId)
			throw new ForbiddenError(
				"Primary page already exists.",
				"PRIMARY_PAGE_ALREADY_EXISTS",
			);
		return currentUser;
	};

export const updatePage = async ({
	db,
	userId,
	handle,
	input,
}: {
	db: DatabaseClient;
	userId: string;
	handle: string;
	input: UpdatePageRequest;
}) => {
	try {
		return await db.transaction(
			async (tx) => {
				const currentUser =
					await tx.query.user.findFirst(
						{
							where: eq(
								userTable.id,
								userId,
							),
						},
					);
				if (!currentUser)
					throw new NotFoundError(
						"Page",
					);
				const existingPage =
					await tx.query.pages.findFirst(
						{
							where: and(
								eq(
									pages.handle,
									handle,
								),
								eq(
									pages.userId,
									currentUser.id,
								),
							),
						},
					);
				if (!existingPage)
					throw new NotFoundError(
						"Page",
					);
				const [page] = await tx
					.update(pages)
					.set({
						handle:
							input.handle ??
							existingPage.handle,
						name:
							input.name === undefined
								? existingPage.name
								: input.name,
						bio:
							input.bio === undefined
								? existingPage.bio
								: input.bio,
						image:
							input.image === undefined
								? existingPage.image
								: input.image,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(
								pages.id,
								existingPage.id,
							),
							eq(
								pages.userId,
								currentUser.id,
							),
						),
					)
					.returning();
				if (!page)
					throw new NotFoundError(
						"Page",
					);
				return page;
			},
		);
	} catch (error) {
		if (isUniqueHandleViolation(error))
			throw new ConflictError(
				"Handle is already taken.",
				"HANDLE_TAKEN",
			);
		throw error;
	}
};

export const createPage = async ({
	db,
	user,
	input,
}: {
	db: DatabaseClient;
	user: Pick<AuthUser, "id">;
	input: CreatePageRequest;
}) => {
	try {
		return await db.transaction(
			async (tx) => {
				const existingPage =
					await tx.query.pages.findFirst(
						{
							where: eq(
								pages.handle,
								input.handle,
							),
						},
					);
				if (existingPage)
					throw new ConflictError(
						"Handle is already taken.",
						"HANDLE_TAKEN",
					);
				const [page] = await tx
					.insert(pages)
					.values({
						id: crypto.randomUUID(),
						userId: user.id,
						handle: input.handle,
						name: input.name,
						bio: input.bio ?? null,
						image: null,
						role: input.role ?? null,
					})
					.returning();
				const [updatedUser] = await tx
					.update(userTable)
					.set({
						primaryPageId: page.id,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(userTable.id, user.id),
							isNull(
								userTable.primaryPageId,
							),
						),
					)
					.returning({
						id: userTable.id,
					});
				if (!updatedUser)
					throw new ForbiddenError(
						"Primary page already exists.",
						"PRIMARY_PAGE_ALREADY_EXISTS",
					);
				return page;
			},
		);
	} catch (error) {
		if (isUniqueHandleViolation(error))
			throw new ConflictError(
				"Handle is already taken.",
				"HANDLE_TAKEN",
			);
		throw error;
	}
};
