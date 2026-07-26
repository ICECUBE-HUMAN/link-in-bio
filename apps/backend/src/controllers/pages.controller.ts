import type { AppEnv } from "@core/app-factory";
import {
	pages,
	user as userTable,
} from "@db/schema";
import {
	type CreatePageResponse,
	createPageRequestSchema,
	createPageResponseSchema,
	type HandleAvailabilityResponse,
	handleAvailabilityResponseSchema,
	isReservedPageHandle,
	normalizePageHandle,
	type MyPageResponse,
	myPageResponseSchema,
	pageByHandleResponseSchema,
	type PageResponse,
	pageHandleSchema,
	type UpdatePageResponse,
	updatePageRequestSchema,
	updatePageResponseSchema,
} from "@sinabro/api";
import {
	and,
	eq,
	isNull,
} from "drizzle-orm";
import {
	type Context,
	Hono,
} from "hono";
import * as v from "valibot";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";

const mapPageResponse = (
	page: typeof pages.$inferSelect,
): PageResponse => ({
	id: page.id,
	userId: page.userId,
	handle: page.handle,
	name: page.name,
	bio: page.bio,
	image: page.image,
	role: page.role,
	createdAt:
		page.createdAt.toISOString(),
	updatedAt:
		page.updatedAt.toISOString(),
});

const isUniqueHandleViolation = (
	error: unknown,
) => {
	if (
		typeof error !== "object" ||
		error === null
	) {
		return false;
	}

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

const assertEligibleUser = async (
	c: Context<AppEnv>,
) => {
	const sessionUser = c.get("user");

	if (!sessionUser) {
		throw new UnauthorizedError();
	}

	const sessionPrimaryPageId =
		"primaryPageId" in sessionUser &&
		typeof sessionUser.primaryPageId ===
			"string"
			? sessionUser.primaryPageId
			: null;

	if (sessionPrimaryPageId) {
		throw new ForbiddenError(
			"Primary page already exists.",
			"PRIMARY_PAGE_ALREADY_EXISTS",
		);
	}

	const currentUser = await c
		.get("db")
		.query.user.findFirst({
			where: eq(
				userTable.id,
				sessionUser.id,
			),
		});

	if (!currentUser) {
		throw new UnauthorizedError();
	}

	if (currentUser.primaryPageId) {
		throw new ForbiddenError(
			"Primary page already exists.",
			"PRIMARY_PAGE_ALREADY_EXISTS",
		);
	}

	return currentUser;
};

const createHandleAvailabilityResponse =
	(
		response: HandleAvailabilityResponse,
	) =>
		v.parse(
			handleAvailabilityResponseSchema,
			response,
		);

const getPrimaryPageId = (user: unknown) => {
	if (
		typeof user !== "object" ||
		user === null
	) {
		return null;
	}

	const maybeUser = user as {
		primaryPageId?: unknown;
	};

	return typeof maybeUser.primaryPageId ===
		"string"
		? maybeUser.primaryPageId
		: null;
};

export const pagesController =
	new Hono<AppEnv>()
		.get("/me", async (c) => {
			const sessionUser = c.get("user");

			if (!sessionUser) {
				throw new UnauthorizedError();
			}

			const sessionPrimaryPageId =
				getPrimaryPageId(sessionUser);

			if (!sessionPrimaryPageId) {
				const response = v.parse(
					myPageResponseSchema,
					{ page: null },
				) satisfies MyPageResponse;

				return c.json(response);
			}

			const page = await c
				.get("db")
				.query.pages.findFirst({
					where: and(
						eq(
							pages.id,
							sessionPrimaryPageId,
						),
						eq(
							pages.userId,
							sessionUser.id,
						),
					),
				});

			const response = v.parse(
				myPageResponseSchema,
				{
					page: page
						? mapPageResponse(page)
						: null,
				},
			) satisfies MyPageResponse;

			return c.json(response);
		})
		.patch("/me", async (c) => {
			const sessionUser = c.get("user");

			if (!sessionUser) {
				throw new UnauthorizedError();
			}

			const body = await c.req.json();
			const parsed = v.safeParse(
				updatePageRequestSchema,
				body,
			);

			if (!parsed.success) {
				throw new UnprocessableEntityError(
					"Invalid page payload.",
					"INVALID_PAGE_PAYLOAD",
				);
			}

			const hasAnyField =
				typeof parsed.output.name !== "undefined" ||
				typeof parsed.output.bio !== "undefined" ||
				typeof parsed.output.image !== "undefined";

			if (!hasAnyField) {
				throw new UnprocessableEntityError(
					"At least one page field is required.",
					"INVALID_PAGE_PAYLOAD",
				);
			}

			const updatedPage = await c
				.get("db")
				.transaction(async (tx) => {
					const currentUser = await tx.query.user.findFirst(
						{
							where: eq(
								userTable.id,
								sessionUser.id,
							),
						},
					);

					const currentPageId =
						getPrimaryPageId(currentUser);

					if (!currentUser || !currentPageId) {
						throw new NotFoundError("Page");
					}

					const existingPage =
						await tx.query.pages.findFirst(
							{
								where: and(
									eq(
										pages.id,
										currentPageId,
									),
									eq(
										pages.userId,
										currentUser.id,
									),
								),
							},
						);

					if (!existingPage) {
						throw new NotFoundError("Page");
					}

					const [page] = await tx
						.update(pages)
						.set({
							name:
								parsed.output.name ??
								existingPage.name,
							bio:
								typeof parsed.output.bio ===
								"undefined"
									? existingPage.bio
									: parsed.output.bio,
							image:
								typeof parsed.output.image ===
								"undefined"
									? existingPage.image
									: parsed.output.image,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(
									pages.id,
									currentPageId,
								),
								eq(
									pages.userId,
									currentUser.id,
								),
							),
						)
						.returning();

					if (!page) {
						throw new NotFoundError("Page");
					}

					return page;
				});

			const response = v.parse(
				updatePageResponseSchema,
				{
					page: mapPageResponse(updatedPage),
				},
			) satisfies UpdatePageResponse;

			return c.json(response);
		})
		.get("/check", async (c) => {
			await assertEligibleUser(c);

			const rawHandle =
				c.req.query("handle") ?? "";
			const handle =
				normalizePageHandle(rawHandle);
			const parsed = v.safeParse(
				pageHandleSchema,
				rawHandle,
			);

			if (!parsed.success) {
				return c.json(
					createHandleAvailabilityResponse(
						{
							handle,
							available: false,
							reason: "invalid",
						},
					),
				);
			}

			if (
				isReservedPageHandle(handle)
			) {
				return c.json(
					createHandleAvailabilityResponse(
						{
							handle,
							available: false,
							reason: "reserved",
						},
					),
				);
			}

			const existingPage = await c
				.get("db")
				.query.pages.findFirst({
					where: eq(
						pages.handle,
						handle,
					),
				});

			return c.json(
				createHandleAvailabilityResponse(
					{
						handle,
						available: !existingPage,
						reason: existingPage
							? "taken"
							: null,
					},
				),
			);
		})
		.get("/:handle", async (c) => {
			const rawHandle = c.req.param("handle");
			const parsed = v.safeParse(
				pageHandleSchema,
				rawHandle,
			);

			if (!parsed.success) {
				throw new NotFoundError("Page");
			}

			const page = await c
				.get("db")
				.query.pages.findFirst({
					where: eq(
						pages.handle,
						parsed.output,
					),
				});

			if (!page) {
				throw new NotFoundError("Page");
			}

			const response = v.parse(
				pageByHandleResponseSchema,
				{
					page: mapPageResponse(page),
				},
			);

			return c.json(response);
		})
		.post("/", async (c) => {
			const currentUser =
				await assertEligibleUser(c);
			const body = await c.req.json();
			const parsed = v.safeParse(
				createPageRequestSchema,
				body,
			);

			if (!parsed.success) {
				throw new UnprocessableEntityError(
					"Invalid page payload.",
					"INVALID_PAGE_PAYLOAD",
				);
			}

			const handle =
				parsed.output.handle;

			if (
				isReservedPageHandle(handle)
			) {
				throw new UnprocessableEntityError(
					"Reserved handle.",
					"RESERVED_HANDLE",
				);
			}

			const createdPage = await c
				.get("db")
				.transaction(async (tx) => {
					const existingPage =
						await tx.query.pages.findFirst(
							{
								where: eq(
									pages.handle,
									handle,
								),
							},
						);

					if (existingPage) {
						throw new ConflictError(
							"Handle is already taken.",
							"HANDLE_TAKEN",
						);
					}

					const [page] = await tx
						.insert(pages)
						.values({
							id: crypto.randomUUID(),
							userId: currentUser.id,
							handle,
							name: parsed.output.name,
							bio:
								parsed.output.bio ??
								null,
							image: null,
							role: null,
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
								eq(
									userTable.id,
									currentUser.id,
								),
								isNull(
									userTable.primaryPageId,
								),
							),
						)
						.returning({
							id: userTable.id,
						});

					if (!updatedUser) {
						throw new ForbiddenError(
							"Primary page already exists.",
							"PRIMARY_PAGE_ALREADY_EXISTS",
						);
					}

					return page;
				})
				.catch((error: unknown) => {
					if (
						isUniqueHandleViolation(
							error,
						)
					) {
						throw new ConflictError(
							"Handle is already taken.",
							"HANDLE_TAKEN",
						);
					}

					throw error;
				});

			const response = v.parse(
				createPageResponseSchema,
				{
					page: mapPageResponse(
						createdPage,
					),
				},
			) satisfies CreatePageResponse;

			return c.json(response, 201);
		});
