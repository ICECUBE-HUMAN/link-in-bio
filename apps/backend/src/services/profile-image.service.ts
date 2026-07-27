import type { AppEnv } from "@core/app-factory";
import {
	createProfileImageKey,
	createProfileImageUploadUrl,
	isProfileImageKey,
	MAX_PROFILE_IMAGE_SIZE,
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
	NotFoundError,
	UnprocessableEntityError,
} from "../exceptions/http-exceptions";
import { assertOwnedPage } from "./page.service";

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
		await assertOwnedPage(
			db,
			handle,
			userId,
		);
		if (
			input.size >
				MAX_PROFILE_IMAGE_SIZE ||
			!validateProfileImageUpload(input)
		)
			throw new UnprocessableEntityError(
				"Invalid profile image.",
				"INVALID_PROFILE_IMAGE",
			);
		const objectKey =
			createProfileImageKey(
				input.contentType,
			);
		if (!objectKey)
			throw new UnprocessableEntityError(
				"Unsupported profile image type.",
				"INVALID_PROFILE_IMAGE",
			);
		return createProfileImageUploadUrl({
			accountId: env.R2_ACCOUNT_ID,
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey:
				env.R2_SECRET_ACCESS_KEY,
			objectKey,
			contentType: input.contentType,
		});
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
		if (
			!isProfileImageKey(
				input.objectKey,
			)
		)
			throw new UnprocessableEntityError(
				"Invalid profile image key.",
				"INVALID_PROFILE_IMAGE",
			);
		const page = await assertOwnedPage(
			db,
			handle,
			userId,
		);
		const uploadedObject =
			await env.IMAGES.head(
				input.objectKey,
			);
		if (
			!uploadedObject ||
			uploadedObject.size >
				MAX_PROFILE_IMAGE_SIZE ||
			!uploadedObject.httpMetadata?.contentType?.startsWith(
				"image/",
			)
		)
			throw new UnprocessableEntityError(
				"Uploaded profile image was not found.",
				"PROFILE_IMAGE_NOT_FOUND",
			);

		if (
			page.image &&
			page.image !== input.objectKey &&
			isProfileImageKey(page.image)
		)
			await env.IMAGES.delete(
				page.image,
			);

		const [updatedPage] = await db
			.update(pages)
			.set({
				image: input.objectKey,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(pages.id, page.id),
					eq(pages.userId, userId),
				),
			)
			.returning();
		if (!updatedPage)
			throw new NotFoundError("Page");
		return updatedPage;
	};
