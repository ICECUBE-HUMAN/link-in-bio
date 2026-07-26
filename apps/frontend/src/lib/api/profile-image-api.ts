import {
	type ProfileImageUploadRequest,
	profileImageCompleteResponseSchema,
	profileImageUploadResponseSchema,
} from "@sinabro/api";
import * as v from "valibot";
import { env } from "@/env";

const publicImageUrl = (objectKey: string) => {
	if (/^https?:\/\//.test(objectKey)) return objectKey;
	if (!env.VITE_R2_PUBLIC_URL) return null;

	return `${env.VITE_R2_PUBLIC_URL.replace(/\/+$/, "")}/${objectKey
		.split("/")
		.map(encodeURIComponent)
		.join("/")}`;
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

export async function uploadPageImage(handle: string, file: File) {
	const request: ProfileImageUploadRequest = {
		contentType: file.type,
		size: file.size,
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

	const r2Response = await fetch(uploadResponse.uploadUrl, {
		method: "PUT",
		headers: { "content-type": file.type },
		body: file,
	});

	if (!r2Response.ok) {
		throw new Error(`R2 upload failed with status ${r2Response.status}.`);
	}

	const completeResponse = await parseResponse(
		await fetch(
			`/api/pages/${encodeURIComponent(handle)}/image-upload/complete`,
			{
				method: "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ objectKey: uploadResponse.objectKey }),
			},
		),
		profileImageCompleteResponseSchema,
	);

	return {
		key: completeResponse.page.image ?? uploadResponse.objectKey,
		url: publicImageUrl(
			completeResponse.page.image ?? uploadResponse.objectKey,
		),
	};
}

export function getProfileImageUrl(image: string | null) {
	return image ? publicImageUrl(image) : null;
}
