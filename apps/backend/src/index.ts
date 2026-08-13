import { authController } from "@controllers/auth.controller";
import { billingController } from "@controllers/billing.controller";
import { healthController } from "@controllers/health.controller";
import { pageItemsController } from "@controllers/page-items.controller";
import { pagesController } from "@controllers/pages.controller";
import { appFactory } from "@core/app-factory";
import { isItemMediaKey } from "@core/r2";
import { createDatabaseClient } from "@db/index";
import { errorHandler } from "@middlewares/error-handler.middleware";
import { notFoundHandler } from "@middlewares/not-found.middleware";

const app = appFactory
	.createApp()
	.notFound(notFoundHandler)
	.onError(errorHandler)
	.route("/auth", authController)
	.route("/billing", billingController)
	.route("/pages", pagesController)
	.route("/pages", pageItemsController)
	.route("/", healthController);

export type AppType = typeof app;

export const queue = async (
	batch: MessageBatch<{
		objectKey: string;
	}>,
	env: CloudflareBindings,
) => {
	await Promise.all(
		batch.messages.map(
			async (message) => {
				if (
					isItemMediaKey(
						message.body.objectKey,
					)
				) {
					await env.IMAGES.delete(
						message.body.objectKey,
					);
				}
			},
		),
	);
};

const ITEM_MEDIA_ORPHAN_AGE_MS =
	24 * 60 * 60 * 1000;

export const scheduled = async (
	_controller: ScheduledController,
	env: CloudflareBindings,
) => {
	const db = createDatabaseClient(env);
	const referencedKeys =
		new Set<string>();
	const items =
		await db.query.pageItems.findMany({
			columns: {
				type: true,
				data: true,
			},
		});
	for (const item of items) {
		if (
			item.type === "media" &&
			typeof item.data.objectKey ===
				"string" &&
			isItemMediaKey(
				item.data.objectKey,
			)
		)
			referencedKeys.add(
				item.data.objectKey,
			);
	}

	const cutoff =
		Date.now() -
		ITEM_MEDIA_ORPHAN_AGE_MS;
	const orphanKeys: string[] = [];
	let cursor: string | undefined;
	for (;;) {
		const listed =
			await env.IMAGES.list({
				prefix: "users/",
				...(cursor ? { cursor } : {}),
			});
		for (const object of listed.objects)
			if (
				isItemMediaKey(object.key) &&
				object.uploaded.getTime() <
					cutoff &&
				!referencedKeys.has(object.key)
			)
				orphanKeys.push(object.key);
		if (!listed.truncated) break;
		cursor = listed.cursor;
	}

	for (
		let index = 0;
		index < orphanKeys.length;
		index += 1000
	)
		await env.IMAGES.delete(
			orphanKeys.slice(
				index,
				index + 1000,
			),
		);
};

export default {
	fetch: app.fetch,
	queue,
	scheduled,
};
