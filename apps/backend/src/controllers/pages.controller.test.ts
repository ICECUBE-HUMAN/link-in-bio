import {
	describe,
	expect,
	it,
} from "bun:test";
import { pagesController } from "@controllers/pages.controller";
import type { AppEnv } from "@core/app-factory";
import { errorHandler } from "@middlewares/error-handler.middleware";
import { Hono } from "hono";

type TestUser = {
	id: string;
	name: string;
	email: string;
	primaryPageId: string | null;
};

type TestPage = {
	id: string;
	userId: string;
	handle: string;
	name: string;
	bio: string | null;
	image: string | null;
	role: string | null;
	createdAt: Date;
	updatedAt: Date;
};

const now = new Date(
	"2026-07-26T00:00:00.000Z",
);

function createFakeDb({
	currentUser,
	existingPages = [],
}: {
	currentUser: TestUser;
	existingPages?: TestPage[];
}) {
	const insertedPages: TestPage[] = [];
	const state = {
		currentUser,
		existingPages,
		insertedPages,
	};

	const tx = {
		query: {
			user: {
				findFirst: async () =>
					state.currentUser,
			},
			pages: {
				findFirst: async () =>
					state.existingPages[0] ??
					null,
			},
		},
		insert: () => ({
			values: (
				value: Omit<
					TestPage,
					"createdAt" | "updatedAt"
				>,
			) => ({
				returning: async () => {
					const page = {
						...value,
						createdAt: now,
						updatedAt: now,
					};
					state.insertedPages.push(
						page,
					);
					return [page];
				},
			}),
		}),
		update: () => ({
			set: (value: {
				primaryPageId?: string;
			}) => ({
				where: () => ({
					returning: async () => {
						if (
							state.currentUser
								.primaryPageId
						) {
							return [];
						}

						state.currentUser.primaryPageId =
							value.primaryPageId ??
							null;
						return [
							{
								id: state.currentUser
									.id,
							},
						];
					},
				}),
			}),
		}),
	};

	return {
		state,
		db: {
			query: tx.query,
			transaction: async <T>(
				callback: (
					transaction: typeof tx,
				) => Promise<T>,
			) => callback(tx),
		},
	};
}

function createTestApp({
	db,
	user,
}: {
	db: unknown;
	user: TestUser | null;
}) {
	return new Hono<AppEnv>()
		.use("*", async (c, next) => {
			c.set("db", db as never);
			c.set(
				"session",
				user
					? ({
							id: "session_1",
						} as never)
					: null,
			);
			c.set("user", user as never);
			await next();
		})
		.onError(errorHandler)
		.route("/pages", pagesController);
}

describe("pagesController", () => {
	it("reports reserved handles as unavailable at /pages/check", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/check?handle=new",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as unknown;
		expect(body).toEqual({
			handle: "new",
			available: false,
			reason: "reserved",
		});
	});

	it("reports invalid handles as unavailable with the submitted handle", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/check?handle=x",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as unknown;
		expect(body).toEqual({
			handle: "x",
			available: false,
			reason: "invalid",
		});
	});

	it("reports existing handles as unavailable at /pages/check", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db } = createFakeDb({
			currentUser: user,
			existingPages: [
				{
					id: "page_existing",
					userId: "user_2",
					handle: "taken",
					name: "Taken",
					bio: null,
					image: null,
					role: null,
					createdAt: now,
					updatedAt: now,
				},
			],
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages/check?handle=taken",
		);

		expect(response.status).toBe(200);
		const body =
			(await response.json()) as unknown;
		expect(body).toEqual({
			handle: "taken",
			available: false,
			reason: "taken",
		});
	});

	it("creates a page and sets the user's primary page", async () => {
		const user = {
			id: "user_1",
			name: "Kim",
			email: "kim@example.com",
			primaryPageId: null,
		};
		const { db, state } = createFakeDb({
			currentUser: user,
		});
		const app = createTestApp({
			db,
			user,
		});

		const response = await app.request(
			"/pages",
			{
				method: "POST",
				headers: {
					"Content-Type":
						"application/json",
				},
				body: JSON.stringify({
					handle: " My-Page ",
					name: "My Page",
					bio: "Hello",
					image: "ignored-image",
					role: "ignored-role",
				}),
			},
		);

		expect(response.status).toBe(201);
		const body =
			(await response.json()) as {
				page: TestPage;
			};
		expect(body.page).toMatchObject({
			userId: "user_1",
			handle: "my-page",
			name: "My Page",
			bio: "Hello",
			image: null,
			role: null,
		});
		expect(
			state.insertedPages,
		).toHaveLength(1);
		expect(
			state.currentUser.primaryPageId,
		).toBe(body.page.id);
	});
});
