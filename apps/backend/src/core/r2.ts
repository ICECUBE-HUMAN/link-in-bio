import type { ProfileImageUploadRequest } from "@sinabro/api";

export const PROFILE_IMAGE_PREFIX =
	"users/profile/";
export const MAX_PROFILE_IMAGE_SIZE =
	5 * 1024 * 1024;
export const PROFILE_IMAGE_UPLOAD_TTL_SECONDS =
	10 * 60;

const supportedImageTypes = new Map([
	["image/avif", "avif"],
	["image/gif", "gif"],
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);

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
	value.startsWith(
		PROFILE_IMAGE_PREFIX,
	) &&
	value.length >
		PROFILE_IMAGE_PREFIX.length &&
	!value.includes("..") &&
	!value.includes("\\");

export const createProfileImageKey = (
	contentType: string,
) => {
	const extension =
		supportedImageTypes.get(
			contentType,
		);
	if (!extension) return null;
	return `${PROFILE_IMAGE_PREFIX}${crypto.randomUUID()}.${extension}`;
};

export const validateProfileImageUpload =
	(input: ProfileImageUploadRequest) =>
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
	now = new Date(),
}: {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	objectKey: string;
	contentType: string;
	now?: Date;
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
	const signedHeaders =
		"content-type;host";
	const query = new URLSearchParams([
		[
			"X-Amz-Algorithm",
			"AWS4-HMAC-SHA256",
		],
		["X-Amz-Credential", credential],
		["X-Amz-Date", amzDate],
		[
			"X-Amz-Expires",
			String(
				PROFILE_IMAGE_UPLOAD_TTL_SECONDS,
			),
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
	const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
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
	const signingKey = await hmacChain(
		secretAccessKey,
		shortDate,
		region,
		service,
	);
	const signature = toHex(
		asArrayBuffer(
			await hmac(
				signingKey,
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
			now.getTime() +
				PROFILE_IMAGE_UPLOAD_TTL_SECONDS *
					1000,
		).toISOString(),
	};
}
