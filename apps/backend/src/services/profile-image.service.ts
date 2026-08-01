import type { AppEnv } from "@core/app-factory";
import {
	createProfileImageCropKey,
	createProfileImageKey,
	createProfileImageStagingKey,
	createProfileImageUploadUrl,
	getProfileImageDisplayContentType,
	isLegacyProfileImageKey,
	isProfileImageCropKey,
	isProfileImageKey,
	isProfileImageStagingKey,
	MAX_PROFILE_IMAGE_SIZE,
	PROFILE_IMAGE_DISPLAY_CACHE_CONTROL,
	validateProfileImageUpload,
} from "@core/r2";
import type { DatabaseClient } from "@db/index";
import { pages } from "@db/schema";
import type {
	ProfileImageCompleteRequest,
	ProfileImageUploadRequest,
} from "@sinabro/api";
import { and, eq } from "drizzle-orm";
import {
	ConflictError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import { assertOwnedPage } from "./page.service";

const profileImagePrefix = (
	userId: string,
	pageId: string,
) =>
	`users/${userId}/${pageId}/profile/`;

const isOwnedProfileObjectKey = ({
	objectKey,
	userId,
	pageId,
	page,
	allowCrop = false,
}: {
	objectKey: string;
	userId: string;
	pageId: string;
	page: typeof pages.$inferSelect;
	allowCrop?: boolean;
}) => {
	const isScopedKey =
		objectKey.startsWith(
			profileImagePrefix(
				userId,
				pageId,
			),
		) &&
		(isProfileImageKey(objectKey) ||
			(allowCrop &&
				isProfileImageCropKey(
					objectKey,
				)));
	if (isScopedKey) return true;

	return (
		isLegacyProfileImageKey(
			objectKey,
		) &&
		(page.image === objectKey ||
			page.imageSource === objectKey)
	);
};

const deleteProfileObjects = async ({
	env,
	keys,
	protectedKeys = [],
}: {
	env: AppEnv["Bindings"];
	keys: Iterable<string>;
	protectedKeys?: Iterable<
		string | null | undefined
	>;
}) => {
	const protectedKeySet = new Set(
		[...protectedKeys].filter(
			(key): key is string =>
				Boolean(key),
		),
	);
	const deletableKeys = [
		...new Set(keys),
	].filter(
		(key) => !protectedKeySet.has(key),
	);
	const results =
		await Promise.allSettled(
			deletableKeys.map((key) =>
				env.IMAGES.delete(key),
			),
		);
	for (const result of results) {
		if (result.status === "rejected") {
			console.error(
				"[profile-image] R2 cleanup failed",
				result.reason,
			);
		}
	}
};

const createUploadSlot = async ({
	env,
	objectKey,
	contentType,
	cacheControl,
}: {
	env: AppEnv["Bindings"];
	objectKey: string;
	contentType: string;
	cacheControl?: string;
}) => ({
	...(await createProfileImageUploadUrl(
		{
			accountId: env.R2_ACCOUNT_ID,
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey:
				env.R2_SECRET_ACCESS_KEY,
			objectKey,
			contentType,
			cacheControl,
		},
	)),
	contentType,
	cacheControl: cacheControl ?? null,
});

export const createProfileImageUpload =
	async ({
		env,
		db,
		handle,
		userId,
		input,
	}: {
		env: AppEnv["Bindings"];
		db: DatabaseClient;
		handle: string;
		userId: string;
		input: ProfileImageUploadRequest;
	}) => {
		const page = await assertOwnedPage(
			db,
			handle,
			userId,
		);
		if (
			input.displaySize >
			MAX_PROFILE_IMAGE_SIZE
		) {
			throw new UnprocessableEntityError(
				"Invalid profile image.",
				"INVALID_PROFILE_IMAGE",
			);
		}
		if (
			input.displayContentType !==
				"image/webp" &&
			input.displayContentType !==
				"image/jpeg"
		) {
			throw new UnprocessableEntityError(
				"Unsupported profile image type.",
				"INVALID_PROFILE_IMAGE",
			);
		}

		const sourceUpload = input.source;
		if (
			!sourceUpload &&
			!input.sourceObjectKey
		) {
			throw new UnprocessableEntityError(
				"A source image is required.",
				"INVALID_PROFILE_IMAGE",
			);
		}

		let sourceObjectKey =
			input.sourceObjectKey;
		let sourceUploadPromise: ReturnType<
			typeof createUploadSlot
		> | null = null;
		if (sourceUpload) {
			if (
				sourceUpload.size >
					MAX_PROFILE_IMAGE_SIZE ||
				!validateProfileImageUpload(
					sourceUpload,
				)
			) {
				throw new UnprocessableEntityError(
					"Invalid profile image.",
					"INVALID_PROFILE_IMAGE",
				);
			}
			sourceObjectKey =
				createProfileImageKey(
					userId,
					page.id,
					sourceUpload.contentType,
				) ?? undefined;
			if (!sourceObjectKey) {
				throw new UnprocessableEntityError(
					"Unsupported profile image type.",
					"INVALID_PROFILE_IMAGE",
				);
			}
			sourceUploadPromise =
				createUploadSlot({
					env,
					objectKey: sourceObjectKey,
					contentType:
						sourceUpload.contentType,
				});
		} else if (
			!sourceObjectKey ||
			sourceObjectKey !==
				(page.imageSource ??
					page.image) ||
			isProfileImageCropKey(
				sourceObjectKey,
			) ||
			!isOwnedProfileObjectKey({
				objectKey: sourceObjectKey,
				userId,
				pageId: page.id,
				page,
			})
		) {
			throw new UnprocessableEntityError(
				"Invalid profile image source.",
				"INVALID_PROFILE_IMAGE",
			);
		}

		const displayObjectKey =
			createProfileImageCropKey(
				userId,
				page.id,
				sourceObjectKey,
				input.displayContentType,
			);
		const displayUploadObjectKey =
			createProfileImageStagingKey(
				userId,
				page.id,
				sourceObjectKey,
				input.displayContentType,
			);
		if (
			!displayObjectKey ||
			!displayUploadObjectKey
		) {
			throw new UnprocessableEntityError(
				"Invalid profile image source.",
				"INVALID_PROFILE_IMAGE",
			);
		}

		const [source, display] =
			await Promise.all([
				sourceUploadPromise ??
					Promise.resolve(null),
				createUploadSlot({
					env,
					objectKey:
						displayUploadObjectKey,
					contentType:
						input.displayContentType,
					cacheControl:
						PROFILE_IMAGE_DISPLAY_CACHE_CONTROL,
				}),
			]);

		return {
			source,
			display,
			expectedUpdatedAt:
				page.updatedAt.toISOString(),
		};
	};

export const completeProfileImageUpload =
	async ({
		env,
		db,
		handle,
		userId,
		input,
	}: {
		env: AppEnv["Bindings"];
		db: DatabaseClient;
		handle: string;
		userId: string;
		input: ProfileImageCompleteRequest;
	}) => {
		const page = await assertOwnedPage(
			db,
			handle,
			userId,
		);
		const expectedUpdatedAt = new Date(
			input.expectedUpdatedAt,
		);
		if (
			Number.isNaN(
				expectedUpdatedAt.getTime(),
			)
		) {
			throw new UnprocessableEntityError(
				"Invalid profile image operation.",
				"INVALID_PROFILE_IMAGE",
			);
		}
		const displayContentType =
			getProfileImageDisplayContentType(
				input.displayObjectKey,
			);
		const displayObjectKey =
			displayContentType
				? createProfileImageCropKey(
						userId,
						page.id,
						input.sourceObjectKey,
						displayContentType,
					)
				: null;
		if (
			!displayContentType ||
			!displayObjectKey ||
			isProfileImageCropKey(
				input.sourceObjectKey,
			) ||
			!isProfileImageStagingKey(
				input.displayObjectKey,
			) ||
			input.displayObjectKey.replace(
				/\.upload-[a-f0-9-]+(?=\.(?:jpg|webp)$)/,
				"",
			) !== displayObjectKey ||
			!isOwnedProfileObjectKey({
				objectKey:
					input.sourceObjectKey,
				userId,
				pageId: page.id,
				page,
			}) ||
			!isOwnedProfileObjectKey({
				objectKey:
					input.displayObjectKey,
				userId,
				pageId: page.id,
				page,
				allowCrop: true,
			})
		) {
			throw new UnprocessableEntityError(
				"Invalid profile image key.",
				"INVALID_PROFILE_IMAGE",
			);
		}

		const [
			sourceObject,
			displayObject,
		] = await Promise.all([
			env.IMAGES.head(
				input.sourceObjectKey,
			),
			env.IMAGES.head(
				input.displayObjectKey,
			),
		]);
		if (
			!sourceObject ||
			sourceObject.size >
				MAX_PROFILE_IMAGE_SIZE ||
			!sourceObject.httpMetadata?.contentType?.startsWith(
				"image/",
			) ||
			!displayObject ||
			displayObject.size >
				MAX_PROFILE_IMAGE_SIZE ||
			displayObject.httpMetadata
				?.contentType !==
				displayContentType
		) {
			throw new UnprocessableEntityError(
				"Uploaded profile image was not found.",
				"PROFILE_IMAGE_NOT_FOUND",
			);
		}

		const stagedObject =
			await env.IMAGES.get(
				input.displayObjectKey,
			);
		if (!stagedObject) {
			throw new UnprocessableEntityError(
				"Uploaded profile image was not found.",
				"PROFILE_IMAGE_NOT_FOUND",
			);
		}

		const previousDisplay =
			page.image === displayObjectKey
				? await env.IMAGES.get(
						displayObjectKey,
					)
				: null;
		const previousDisplayBytes =
			previousDisplay
				? await previousDisplay.arrayBuffer()
				: null;

		try {
			await env.IMAGES.put(
				displayObjectKey,
				await stagedObject.arrayBuffer(),
				{
					httpMetadata: {
						contentType:
							displayContentType,
						cacheControl:
							PROFILE_IMAGE_DISPLAY_CACHE_CONTROL,
					},
				},
			);
		} catch (error) {
			await deleteProfileObjects({
				env,
				keys: [
					input.displayObjectKey,
					displayObjectKey,
				],
				protectedKeys: [
					page.image,
					page.imageSource,
				],
			});
			throw error;
		}

		let updatedPage:
			| typeof page
			| undefined;
		try {
			[updatedPage] = await db
				.update(pages)
				.set({
					image: displayObjectKey,
					imageSource:
						input.sourceObjectKey,
					imageCrop: input.crop,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(pages.id, page.id),
						eq(pages.userId, userId),
						eq(
							pages.updatedAt,
							expectedUpdatedAt,
						),
					),
				)
				.returning();
			if (!updatedPage)
				throw new ConflictError(
					"Profile image changed while it was being cropped.",
					"PROFILE_IMAGE_OPERATION_STALE",
				);
		} catch (error) {
			if (previousDisplayBytes) {
				try {
					await env.IMAGES.put(
						displayObjectKey,
						previousDisplayBytes,
						{
							httpMetadata: {
								contentType:
									previousDisplay
										?.httpMetadata
										?.contentType ??
									"image/webp",
								cacheControl:
									previousDisplay
										?.httpMetadata
										?.cacheControl ??
									PROFILE_IMAGE_DISPLAY_CACHE_CONTROL,
							},
						},
					);
				} catch (restoreError) {
					console.error(
						"[profile-image] R2 display restore failed",
						restoreError,
					);
				}
			}
			await deleteProfileObjects({
				env,
				keys: [
					input.sourceObjectKey,
					input.displayObjectKey,
					displayObjectKey,
				],
				protectedKeys: [
					page.image,
					page.imageSource,
				],
			});
			throw error;
		}

		const oldKeys = new Set(
			[
				page.image,
				page.imageSource,
			].filter((key): key is string =>
				Boolean(key),
			),
		);
		await deleteProfileObjects({
			env,
			keys: [
				...oldKeys,
				input.displayObjectKey,
			].filter(
				(oldKey) =>
					isProfileImageKey(oldKey) ||
					isLegacyProfileImageKey(
						oldKey,
					),
			),
			protectedKeys: [
				updatedPage.image,
				updatedPage.imageSource,
			],
		});

		return updatedPage;
	};
