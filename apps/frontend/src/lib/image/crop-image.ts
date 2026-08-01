import type { ProfileImageCrop } from "@sinabro/api";

export type CropAreaPixels = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type CropAreaPercentages = ProfileImageCrop;

export type ProfileImageCropExport = {
	file: File;
	crop: ProfileImageCrop;
};

const DISPLAY_IMAGE_TYPES = new Set(["image/jpeg", "image/webp"]);

type LoadedImage = CanvasImageSource & {
	naturalWidth?: number;
	naturalHeight?: number;
	width: number;
	height: number;
};

function getCropSourceUrl(source: string) {
	if (!/^https?:\/\//.test(source)) return source;

	const sourceUrl = new URL(source);
	if (sourceUrl.origin === window.location.origin) return source;

	return `/api/profile-image?url=${encodeURIComponent(sourceUrl.toString())}`;
}

async function loadImage(source: string): Promise<LoadedImage> {
	const response = await fetch(getCropSourceUrl(source));
	if (!response.ok) {
		throw new Error("Unable to load the profile image.");
	}
	const blob = await response.blob();

	if (typeof createImageBitmap === "function") {
		return createImageBitmap(blob, {
			imageOrientation: "from-image",
		});
	}

	const objectUrl = URL.createObjectURL(blob);
	try {
		const image = new Image();
		image.decoding = "async";
		image.src = objectUrl;
		await image.decode();
		return image;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

function revokeImageSource(image: LoadedImage) {
	if ("close" in image && typeof image.close === "function") {
		image.close();
	}
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: "image/webp" | "image/jpeg",
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Unable to export the cropped image."));
			},
			type,
			0.88,
		);
	});
}

export async function normalizeProfileImageDisplayFile(
	file: File,
): Promise<File> {
	if (DISPLAY_IMAGE_TYPES.has(file.type)) return file;

	const sourceUrl = URL.createObjectURL(file);
	try {
		const image = await loadImage(sourceUrl);
		try {
			const canvas = document.createElement("canvas");
			canvas.width = image.width;
			canvas.height = image.height;

			const context = canvas.getContext("2d");
			if (!context) {
				throw new Error("Unable to prepare the profile image.");
			}
			context.drawImage(image, 0, 0, image.width, image.height);

			let contentType: "image/webp" | "image/jpeg" = "image/webp";
			let blob: Blob;
			try {
				blob = await canvasToBlob(canvas, contentType);
				if (blob.type !== contentType) throw new Error("WebP is unsupported.");
			} catch {
				contentType = "image/jpeg";
				blob = await canvasToBlob(canvas, contentType);
			}

			return new File(
				[blob],
				`profile.${contentType === "image/webp" ? "webp" : "jpg"}`,
				{ type: contentType },
			);
		} finally {
			revokeImageSource(image);
		}
	} finally {
		URL.revokeObjectURL(sourceUrl);
	}
}

export async function exportProfileImageCrop({
	sourceUrl,
	croppedAreaPixels,
	croppedAreaPercentages,
}: {
	sourceUrl: string;
	croppedAreaPixels: CropAreaPixels;
	croppedAreaPercentages: CropAreaPercentages;
}): Promise<ProfileImageCropExport> {
	const image = await loadImage(sourceUrl);
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 512;

	const context = canvas.getContext("2d");
	if (!context) {
		revokeImageSource(image);
		throw new Error("Unable to prepare the cropped image.");
	}

	try {
		context.drawImage(
			image,
			croppedAreaPixels.x,
			croppedAreaPixels.y,
			croppedAreaPixels.width,
			croppedAreaPixels.height,
			0,
			0,
			512,
			512,
		);

		let contentType: "image/webp" | "image/jpeg" = "image/webp";
		let blob: Blob;
		try {
			blob = await canvasToBlob(canvas, contentType);
			if (blob.type !== contentType) throw new Error("WebP is unsupported.");
		} catch {
			contentType = "image/jpeg";
			blob = await canvasToBlob(canvas, contentType);
		}

		return {
			file: new File(
				[blob],
				`profile-crop.${contentType === "image/webp" ? "webp" : "jpg"}`,
				{
					type: contentType,
				},
			),
			crop: croppedAreaPercentages,
		};
	} finally {
		revokeImageSource(image);
	}
}
