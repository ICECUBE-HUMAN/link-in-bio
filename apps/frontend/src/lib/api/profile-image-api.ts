import {
	type ProfileImageCompleteRequest,
	type ProfileImageCrop,
	type ProfileImageUploadRequest,
	profileImageCompleteResponseSchema,
	profileImageUploadResponseSchema,
} from "@sinabro/api";
import * as v from "valibot";
import { env } from "@/env";

const publicImageUrl = (objectKey: string, cacheVersion?: string | null) => {
	if (/^https?:\/\//.test(objectKey)) return objectKey;
	if (!env.VITE_R2_PUBLIC_URL) return null;

	const url = `${env.VITE_R2_PUBLIC_URL.replace(/\/+$/, "")}/${objectKey
		.split("/")
		.map(encodeURIComponent)
		.join("/")}`;
	return cacheVersion ? `${url}?v=${encodeURIComponent(cacheVersion)}` : url;
};

async function parseResponse<T>(
	response: Response,
	schema: v.GenericSchema<T>,
) {
	if (!response.ok) {
		throw new Error(`Image upload failed with status ${response.status}.`);
	}

	return v.parse(schema, await response.json());
}

async function uploadObject(
	slot: {
		uploadUrl: string;
		contentType: string;
		cacheControl: string | null;
	},
	file: File,
) {
	const headers = new Headers({
		"content-type": slot.contentType,
	});
	if (slot.cacheControl) {
		headers.set("cache-control", slot.cacheControl);
	}

	const response = await fetch(slot.uploadUrl, {
		method: "PUT",
		headers,
		body: file,
	});
	if (!response.ok) {
		throw new Error(`R2 upload failed with status ${response.status}.`);
	}
}

export type ProfileImageUploadInput = {
	sourceFile: File;
	crop: ProfileImageCrop;
};

export type ProfileImageUploadResult = {
	key: string;
	url: string | null;
	sourceKey: string;
	crop: ProfileImageCrop;
	updatedAt: string;
};

export async function uploadPageImage(
	handle: string,
	input: ProfileImageUploadInput,
): Promise<ProfileImageUploadResult> {
	const request: ProfileImageUploadRequest = {
		contentType: input.sourceFile.type,
		size: input.sourceFile.size,
	};
	const uploadResponse = await parseResponse(
		await fetch(`/api/pages/${encodeURIComponent(handle)}/image-upload`, {
			method: "POST",
			credentials: "include",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(request),
		}),
		profileImageUploadResponseSchema,
	);

	await uploadObject(uploadResponse.source, input.sourceFile);

	const completeRequest: ProfileImageCompleteRequest = {
		sourceObjectKey: uploadResponse.source.objectKey,
		crop: input.crop,
		expectedUpdatedAt: uploadResponse.expectedUpdatedAt,
	};
	const completeResponse = await parseResponse(
		await fetch(
			`/api/pages/${encodeURIComponent(handle)}/image-upload/complete`,
			{
				method: "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(completeRequest),
			},
		),
		profileImageCompleteResponseSchema,
	);

	const key = completeResponse.page.image ?? uploadResponse.source.objectKey;
	return {
		key,
		url: publicImageUrl(key, completeResponse.page.updatedAt),
		sourceKey:
			completeResponse.page.imageSource ?? completeRequest.sourceObjectKey,
		crop: completeResponse.page.imageCrop ?? input.crop,
		updatedAt: completeResponse.page.updatedAt,
	};
}

export function getProfileImageUrl(
	image: string | null,
	cacheVersion?: string | null,
) {
	return image ? publicImageUrl(image, cacheVersion) : null;
}
