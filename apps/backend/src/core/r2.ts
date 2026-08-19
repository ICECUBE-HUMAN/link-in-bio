import type { PageItemUploadRequest } from "@grabbin/api";
import {
	MAX_ITEM_MEDIA_SIZE as SHARED_MAX_ITEM_MEDIA_SIZE,
	MAX_PROFILE_IMAGE_SIZE as SHARED_MAX_PROFILE_IMAGE_SIZE,
} from "@grabbin/api";

export const LEGACY_PROFILE_IMAGE_PREFIX =
	"users/profile/";
export const MAX_PROFILE_IMAGE_SIZE =
	SHARED_MAX_PROFILE_IMAGE_SIZE;
export const PROFILE_IMAGE_UPLOAD_TTL_SECONDS =
	10 * 60;
export const PROFILE_IMAGE_DISPLAY_CONTENT_TYPE =
	"image/webp";
export const PROFILE_IMAGE_DISPLAY_CACHE_CONTROL =
	"no-cache, must-revalidate";
export const MAX_ITEM_MEDIA_SIZE =
	SHARED_MAX_ITEM_MEDIA_SIZE;
export const ITEM_MEDIA_PREFIX =
	"users/";
export const ITEM_MEDIA_UPLOAD_TTL_SECONDS =
	10 * 60;

const supportedImageTypes = new Map([
	["image/avif", "avif"],
	["image/gif", "gif"],
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);

const supportedDisplayImageTypes =
	new Map([
		["image/jpeg", "jpg"],
		["image/webp", "webp"],
	]);

const displayImageTypesByExtension =
	new Map([
		["jpg", "image/jpeg"],
		["webp", "image/webp"],
	]);

const mediaTypePattern =
	/^(image|video)\/[a-z0-9.+-]+$/i;

const awsEncode = (value: string) =>
	encodeURIComponent(value).replace(
		/[!'()*]/g,
		(character) =>
			`%${character.charCodeAt(0).toString(16).toUpperCase()}`,
	);

const asArrayBuffer = (
	bytes: Uint8Array<ArrayBufferLike>,
) =>
	bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;

const toHex = (bytes: ArrayBuffer) =>
	Array.from(
		new Uint8Array(bytes),
		(byte) =>
			byte
				.toString(16)
				.padStart(2, "0"),
	).join("");

const sha256 = async (value: string) =>
	toHex(
		await crypto.subtle.digest(
			"SHA-256",
			asArrayBuffer(
				new TextEncoder().encode(value),
			),
		),
	);

const hmac = async (
	key: Uint8Array,
	value: string,
) =>
	new Uint8Array(
		await crypto.subtle.sign(
			"HMAC",
			await crypto.subtle.importKey(
				"raw",
				asArrayBuffer(key),
				{
					name: "HMAC",
					hash: "SHA-256",
				},
				false,
				["sign"],
			),
			asArrayBuffer(
				new TextEncoder().encode(value),
			),
		),
	);

const hmacChain = async (
	secret: string,
	date: string,
	region: string,
	service: string,
) => {
	const dateKey = await hmac(
		new TextEncoder().encode(
			`AWS4${secret}`,
		),
		date,
	);
	const regionKey = await hmac(
		dateKey,
		region,
	);
	const serviceKey = await hmac(
		regionKey,
		service,
	);
	return hmac(
		serviceKey,
		"aws4_request",
	);
};

const encodeObjectKeyPath = (
	objectKey: string,
) =>
	objectKey
		.split("/")
		.map(awsEncode)
		.join("/");

export const isProfileImageKey = (
	value: string,
) =>
	/^users\/[^/]+\/[^/]+\/profile\/[^/]+$/.test(
		value,
	) &&
	!value.includes("..") &&
	!value.includes("\\");

export const isLegacyProfileImageKey = (
	value: string,
) =>
	/^users\/profile\/[^/]+$/.test(
		value,
	) &&
	!value.includes("..") &&
	!value.includes("\\");

export const createProfileImageKey = (
	userId: string,
	pageId: string,
	contentType: string,
) => {
	const extension =
		supportedImageTypes.get(
			contentType,
		);

	if (!extension) return null;
	if (
		!isSafePathSegment(userId) ||
		!isSafePathSegment(pageId)
	)
		return null;
	return `users/${userId}/${pageId}/profile/${crypto.randomUUID()}.${extension}`;
};

export const createProfileImageCropKey =
	(
		userId: string,
		pageId: string,
		sourceObjectKey: string,
		contentType = PROFILE_IMAGE_DISPLAY_CONTENT_TYPE,
	) => {
		if (
			!isSafePathSegment(userId) ||
			!isSafePathSegment(pageId)
		)
			return null;
		const sourceFilename =
			sourceObjectKey.split("/").pop();
		const sourceBase =
			sourceFilename?.replace(
				/\.[^.]+$/,
				"",
			);
		const extension =
			supportedDisplayImageTypes.get(
				contentType,
			);
		if (
			!sourceBase ||
			!isSafePathSegment(sourceBase) ||
			!extension
		)
			return null;
		return `users/${userId}/${pageId}/profile/${sourceBase}-crop.${extension}`;
	};

export const createProfileImageStagingKey =
	(
		userId: string,
		pageId: string,
		sourceObjectKey: string,
		contentType = PROFILE_IMAGE_DISPLAY_CONTENT_TYPE,
	) => {
		const cropKey =
			createProfileImageCropKey(
				userId,
				pageId,
				sourceObjectKey,
				contentType,
			);
		if (!cropKey) return null;
		return cropKey.replace(
			/\.(jpg|webp)$/,
			`.upload-${crypto.randomUUID()}.$1`,
		);
	};

export const isProfileImageCropKey = (
	value: string,
) =>
	/^users\/[^/]+\/[^/]+\/profile\/[^/]+-crop\.(?:jpg|webp)$/.test(
		value,
	) &&
	!value.includes("..") &&
	!value.includes("\\");

export const isProfileImageStagingKey =
	(value: string) =>
		/^users\/[^/]+\/[^/]+\/profile\/[^/]+-crop\.upload-[a-f0-9-]+\.(?:jpg|webp)$/.test(
			value,
		) &&
		!value.includes("..") &&
		!value.includes("\\");

export const getProfileImageDisplayContentType =
	(value: string) => {
		const extension = value
			.split(".")
			.pop();
		return extension
			? (displayImageTypesByExtension.get(
					extension,
				) ?? null)
			: null;
	};

export const isItemMediaKey = (
	value: string,
) =>
	/^users\/[^/]+\/[^/]+\/[^/]+$/.test(
		value,
	) &&
	!value.includes("..") &&
	!value.includes("\\");

export const sanitizeMediaFilename = (
	filename: string,
) => {
	if (
		filename.includes("/") ||
		filename.includes("\\") ||
		filename === "." ||
		filename === ".."
	)
		return null;
	const sanitized = filename
		.normalize("NFKC")
		.replace(/[^a-zA-Z0-9._-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^[-.]+|[-.]+$/g, "")
		.slice(0, 120);
	return sanitized || null;
};

const isSafePathSegment = (
	value: string,
) =>
	/^[a-zA-Z0-9_-]+$/.test(value) &&
	value !== "." &&
	value !== "..";

export const createItemMediaKey = ({
	userId,
	pageId,
	filename,
}: Pick<
	PageItemUploadRequest,
	"filename"
> & {
	userId: string;
	pageId: string;
}) => {
	const sanitized =
		sanitizeMediaFilename(filename);
	if (
		!sanitized ||
		!isSafePathSegment(userId) ||
		!isSafePathSegment(pageId)
	)
		return null;
	return `users/${userId}/${pageId}/${sanitized}`;
};

export const validateItemMediaUpload =
	({
		contentType,
		size,
	}: Pick<
		PageItemUploadRequest,
		"contentType" | "size"
	>) =>
		mediaTypePattern.test(
			contentType,
		) && size <= MAX_ITEM_MEDIA_SIZE;

export const getItemMediaUrl = (
	publicBaseUrl: string | undefined,
	objectKey: string,
) =>
	publicBaseUrl &&
	isItemMediaKey(objectKey)
		? getPublicR2ObjectUrl(
				publicBaseUrl,
				objectKey,
			)
		: undefined;

export const getPublicR2ObjectUrl = (
	publicBaseUrl: string | undefined,
	objectKey: string,
) =>
	publicBaseUrl
		? `${publicBaseUrl.replace(/\/+$/, "")}/${objectKey.split("/").map(encodeURIComponent).join("/")}`
		: undefined;

export const validateProfileImageUpload =
	(input: {
		contentType: string;
		size: number;
	}) =>
		input.size <=
			MAX_PROFILE_IMAGE_SIZE &&
		supportedImageTypes.has(
			input.contentType,
		);

export async function createProfileImageUploadUrl({
	accountId,
	accessKeyId,
	secretAccessKey,
	objectKey,
	contentType,
	cacheControl,
	now = new Date(),
}: {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	objectKey: string;
	contentType: string;
	cacheControl?: string;
	now?: Date;
}) {
	return createSignedUploadUrl({
		accountId,
		accessKeyId,
		secretAccessKey,
		objectKey,
		contentType,
		cacheControl,
		ttlSeconds:
			PROFILE_IMAGE_UPLOAD_TTL_SECONDS,
		now,
	});
}

export async function createItemMediaUploadUrl({
	accountId,
	accessKeyId,
	secretAccessKey,
	objectKey,
	contentType,
	now = new Date(),
}: Omit<
	Parameters<
		typeof createProfileImageUploadUrl
	>[0],
	"cacheControl"
>) {
	return createSignedUploadUrl({
		accountId,
		accessKeyId,
		secretAccessKey,
		objectKey,
		contentType,
		ttlSeconds:
			ITEM_MEDIA_UPLOAD_TTL_SECONDS,
		now,
	});
}

async function createSignedUploadUrl({
	accountId,
	accessKeyId,
	secretAccessKey,
	objectKey,
	contentType,
	cacheControl,
	ttlSeconds,
	now,
}: {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	objectKey: string;
	contentType: string;
	cacheControl?: string;
	ttlSeconds: number;
	now: Date;
}) {
	const region = "auto";
	const service = "s3";
	const host = `${accountId}.r2.cloudflarestorage.com`;
	const bucket = "test-images";
	const amzDate = now
		.toISOString()
		.replace(/[:-]|\.\d{3}/g, "");
	const shortDate = amzDate.slice(0, 8);
	const credential = `${accessKeyId}/${shortDate}/${region}/${service}/aws4_request`;
	const signedHeaders = cacheControl
		? "cache-control;content-type;host"
		: "content-type;host";
	const query = new URLSearchParams([
		[
			"X-Amz-Algorithm",
			"AWS4-HMAC-SHA256",
		],
		["X-Amz-Credential", credential],
		["X-Amz-Date", amzDate],
		[
			"X-Amz-Expires",
			String(ttlSeconds),
		],
		[
			"X-Amz-SignedHeaders",
			signedHeaders,
		],
	]);
	const canonicalQueryString =
		Array.from(query.entries())
			.sort(([left], [right]) =>
				left.localeCompare(right),
			)
			.map(
				([key, value]) =>
					`${awsEncode(key)}=${awsEncode(value)}`,
			)
			.join("&");
	const canonicalUri = `/${bucket}/${encodeObjectKeyPath(objectKey)}`;
	const canonicalHeaders = cacheControl
		? `cache-control:${cacheControl}\ncontent-type:${contentType}\nhost:${host}\n`
		: `content-type:${contentType}\nhost:${host}\n`;
	const canonicalRequest = [
		"PUT",
		canonicalUri,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		"UNSIGNED-PAYLOAD",
	].join("\n");
	const scope = `${shortDate}/${region}/${service}/aws4_request`;
	const stringToSign = [
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		await sha256(canonicalRequest),
	].join("\n");
	const signature = toHex(
		asArrayBuffer(
			await hmac(
				await hmacChain(
					secretAccessKey,
					shortDate,
					region,
					service,
				),
				stringToSign,
			),
		),
	);
	query.set(
		"X-Amz-Signature",
		signature,
	);

	return {
		objectKey,
		uploadUrl: `https://${host}${canonicalUri}?${Array.from(
			query.entries(),
		)
			.sort(([left], [right]) =>
				left.localeCompare(right),
			)
			.map(
				([key, value]) =>
					`${awsEncode(key)}=${awsEncode(value)}`,
			)
			.join("&")}`,
		expiresAt: new Date(
			now.getTime() + ttlSeconds * 1000,
		).toISOString(),
	};
}
