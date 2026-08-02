import { CircleArrowOutUpRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MAX_PROFILE_IMAGE_SIZE, type ProfileImageCrop } from "@sinabro/api";
import { CropIcon, TrashIcon } from "lucide-react";
import {
	type ChangeEvent,
	type MouseEvent,
	type PointerEvent,
	type SyntheticEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { CropProfileImageDialog } from "@/components/page/crop-profile-image-dialog";
import { Button } from "@/components/ui/button";
import {
	getProfileImageUrl,
	uploadPageImage,
} from "@/lib/api/profile-image-api";
import type { Breakpoint } from "@/lib/grid/types";
import {
	getCenteredProfileImageCrop,
	getProfileImageCropImageStyle,
	isSquareProfileImageCrop,
	normalizeProfileImageDisplayFile,
	type ProfileImageCropExport,
	type ProfileImageSourceSize,
} from "@/lib/image/crop-image";
import { getPageLayoutClasses } from "@/lib/page/page-layout";
import type { EditablePageFields } from "@/lib/page/page-update";
import { DEFAULT_IMAGE_DATA_URL } from "@/lib/shared/default-image";

type ProfileImageChange = Pick<
	EditablePageFields,
	"image" | "imageSource" | "imageCrop"
>;

const SUPPORTED_PROFILE_IMAGE_TYPES = new Set([
	"image/avif",
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/webp",
]);

const FULL_IMAGE_CROP = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
} satisfies ProfileImageCrop;

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

type PageImageEditorProps = {
	initialImage: string | null;
	initialImageUpdatedAt: string;
	initialImageSource: string | null;
	initialImageCrop: ProfileImageCrop | null;
	handle: string;
	mode: "view" | "edit";
	breakpoint: Breakpoint;
	onImageChange: (change: ProfileImageChange) => void;
	onImageCommit: (change: ProfileImageChange) => void;
};

export function PageImageEditor({
	initialImage,
	initialImageUpdatedAt,
	initialImageSource,
	initialImageCrop,
	handle,
	mode,
	breakpoint,
	onImageChange,
	onImageCommit,
}: PageImageEditorProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const imageFrameRef = useRef<HTMLButtonElement>(null);
	const cropButtonRef = useRef<HTMLButtonElement>(null);
	const cropApplyRequestRef = useRef<(() => void) | null>(null);
	const sourcePreviewUrlRef = useRef<string | null>(null);
	const pendingDisplayUrlRef = useRef<string | null>(null);
	const pendingDisplayKeyRef = useRef<string | null>(null);
	const closeCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const committedRef = useRef<ProfileImageChange>({
		image: initialImage,
		imageSource: initialImageSource,
		imageCrop: initialImageCrop,
	});
	const applyStartedRef = useRef(false);
	const [imageVersion, setImageVersion] = useState(initialImageUpdatedAt);
	const [image, setImage] = useState(
		getProfileImageUrl(initialImage, initialImageUpdatedAt),
	);
	const [imageSource, setImageSource] = useState(initialImageSource);
	const [imageCrop, setImageCrop] = useState(initialImageCrop);
	const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
	const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
	const [cropSourceKey, setCropSourceKey] = useState<string | null>(null);
	const [isCropOpen, setIsCropOpen] = useState(false);
	const [crop, setCrop] = useState<ProfileImageCrop>(FULL_IMAGE_CROP);
	const [sourceImageSize, setSourceImageSize] =
		useState<ProfileImageSourceSize | null>(null);
	const [isCropApplying, setIsCropApplying] = useState(false);
	const [pendingDisplayUrl, setPendingDisplayUrl] = useState<string | null>(
		null,
	);
	const [isUploading, setIsUploading] = useState(false);
	const [imageFrameSize, setImageFrameSize] = useState(112);
	const [error, setError] = useState<string | null>(null);
	const cropDragRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		startCrop: ProfileImageCrop;
	} | null>(null);
	const didCropDragRef = useRef(false);
	const layoutClasses = getPageLayoutClasses(breakpoint);

	useEffect(() => {
		const imageFrame = imageFrameRef.current;
		if (!imageFrame) return;
		const updateImageFrameSize = () => {
			setImageFrameSize(Math.round(imageFrame.getBoundingClientRect().width));
		};
		updateImageFrameSize();
		const observer = new ResizeObserver(updateImageFrameSize);
		observer.observe(imageFrame);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (isUploading) return;
		if (pendingDisplayUrl) {
			if (pendingDisplayKeyRef.current === initialImage) {
				pendingDisplayKeyRef.current = null;
				setPendingDisplayUrl(null);
			}
			return;
		}
		const nextCommitted = {
			image: initialImage,
			imageSource: initialImageSource,
			imageCrop: initialImageCrop,
		};
		if (
			committedRef.current.image === nextCommitted.image &&
			committedRef.current.imageSource === nextCommitted.imageSource &&
			JSON.stringify(committedRef.current.imageCrop) ===
				JSON.stringify(nextCommitted.imageCrop)
		) {
			return;
		}
		committedRef.current = nextCommitted;
		setImageVersion(initialImageUpdatedAt);
		setImage(getProfileImageUrl(nextCommitted.image, initialImageUpdatedAt));
		setImageSource(nextCommitted.imageSource);
		setImageCrop(nextCommitted.imageCrop);
	}, [
		initialImage,
		initialImageCrop,
		initialImageUpdatedAt,
		initialImageSource,
		isUploading,
		pendingDisplayUrl,
	]);

	useEffect(() => {
		return () => {
			if (closeCleanupTimerRef.current) {
				clearTimeout(closeCleanupTimerRef.current);
			}
			if (sourcePreviewUrlRef.current) {
				URL.revokeObjectURL(sourcePreviewUrlRef.current);
			}
			if (pendingDisplayUrlRef.current?.startsWith("blob:")) {
				URL.revokeObjectURL(pendingDisplayUrlRef.current);
			}
		};
	}, []);

	function restoreCommittedImage() {
		const committed = committedRef.current;
		setImage(getProfileImageUrl(committed.image, imageVersion));
		setImageSource(committed.imageSource);
		setImageCrop(committed.imageCrop);
	}

	function clearSourcePreview() {
		if (closeCleanupTimerRef.current) {
			clearTimeout(closeCleanupTimerRef.current);
			closeCleanupTimerRef.current = null;
		}
		if (sourcePreviewUrlRef.current) {
			URL.revokeObjectURL(sourcePreviewUrlRef.current);
			sourcePreviewUrlRef.current = null;
		}
		setCropSourceUrl(null);
		setCropSourceFile(null);
		setCropSourceKey(null);
	}

	function clearPendingDisplayPreview() {
		if (pendingDisplayUrlRef.current?.startsWith("blob:")) {
			URL.revokeObjectURL(pendingDisplayUrlRef.current);
		}
		pendingDisplayUrlRef.current = null;
		pendingDisplayKeyRef.current = null;
		setPendingDisplayUrl(null);
	}

	function scheduleSourcePreviewCleanup() {
		if (closeCleanupTimerRef.current) {
			clearTimeout(closeCleanupTimerRef.current);
		}
		closeCleanupTimerRef.current = setTimeout(() => {
			closeCleanupTimerRef.current = null;
			clearSourcePreview();
		}, 180);
	}

	function getInitialCrop(sourceSize: ProfileImageSourceSize | null) {
		if (
			imageCrop &&
			sourceSize &&
			isSquareProfileImageCrop(imageCrop, sourceSize)
		) {
			return imageCrop;
		}
		if (imageCrop && !sourceSize) return imageCrop;
		return sourceSize
			? getCenteredProfileImageCrop(sourceSize)
			: FULL_IMAGE_CROP;
	}

	function openExistingCrop() {
		if (closeCleanupTimerRef.current) {
			clearTimeout(closeCleanupTimerRef.current);
			closeCleanupTimerRef.current = null;
		}
		const sourceKey = imageSource ?? initialImage;
		const sourceUrl = getProfileImageUrl(sourceKey);
		if (!sourceUrl) return;
		setError(null);
		setCropSourceKey(sourceKey);
		setCropSourceUrl(sourceUrl);
		setCropSourceFile(null);
		setSourceImageSize(null);
		setCrop(getInitialCrop(sourceImageSize));
		setIsCropOpen(true);
	}

	function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		event.target.value = "";
		if (
			!SUPPORTED_PROFILE_IMAGE_TYPES.has(file.type) ||
			file.size > MAX_PROFILE_IMAGE_SIZE
		) {
			setError("Choose an image smaller than 5 MB.");
			return;
		}

		if (!image) {
			const nextDisplayUrl = URL.createObjectURL(file);
			startImageUpload({
				sourceFile: file,
				displayFile: normalizeProfileImageDisplayFile(file),
				crop: FULL_IMAGE_CROP,
				nextDisplayUrl,
			});
			return;
		}

		clearPendingDisplayPreview();
		clearSourcePreview();
		const previewUrl = URL.createObjectURL(file);
		sourcePreviewUrlRef.current = previewUrl;
		setImage(previewUrl);
		setCropSourceFile(file);
		setCropSourceUrl(previewUrl);
		setCropSourceKey(null);
		setImageSource(null);
		setImageCrop(null);
		setSourceImageSize(null);
		setCrop(FULL_IMAGE_CROP);
		setError(null);
		setIsCropOpen(true);
	}

	function handleCropCancel() {
		restoreCommittedImage();
		setIsCropOpen(false);
		setError(null);
		scheduleSourcePreviewCleanup();
	}

	function handleCropDialogChange(open: boolean) {
		if (open) {
			setIsCropOpen(true);
			return;
		}
		if (applyStartedRef.current) {
			applyStartedRef.current = false;
			setIsCropOpen(false);
			return;
		}
		handleCropCancel();
	}

	type ImageUploadInput = {
		sourceFile?: File;
		sourceObjectKey?: string | null;
		displayFile: File | Promise<File>;
		crop: ProfileImageCrop;
		nextDisplayUrl: string;
	};

	function startImageUpload({
		sourceFile,
		sourceObjectKey,
		displayFile,
		crop,
		nextDisplayUrl,
	}: ImageUploadInput) {
		pendingDisplayUrlRef.current = nextDisplayUrl;
		setPendingDisplayUrl(nextDisplayUrl);
		setImage(nextDisplayUrl);
		setIsUploading(true);
		setError(null);

		void (async () => {
			try {
				const uploadedImage = await uploadPageImage(handle, {
					sourceFile,
					sourceObjectKey,
					displayFile: await displayFile,
					crop,
				});
				const nextChange = {
					image: uploadedImage.key,
					imageSource: uploadedImage.sourceKey,
					imageCrop: uploadedImage.crop,
				};
				committedRef.current = nextChange;
				setImageVersion(uploadedImage.updatedAt);
				setImage(uploadedImage.url ?? nextDisplayUrl);
				setImageSource(nextChange.imageSource);
				setImageCrop(nextChange.imageCrop);
				onImageCommit(nextChange);
				if (uploadedImage.url) {
					clearPendingDisplayPreview();
				} else {
					pendingDisplayKeyRef.current = uploadedImage.key;
				}
				scheduleSourcePreviewCleanup();
			} catch (uploadError) {
				clearPendingDisplayPreview();
				scheduleSourcePreviewCleanup();
				restoreCommittedImage();
				setError(
					uploadError instanceof Error
						? uploadError.message
						: "Image upload failed.",
				);
			} finally {
				setIsUploading(false);
			}
		})();
	}

	function handleCropApply(result: ProfileImageCropExport): string | null {
		if (!cropSourceUrl) return null;
		applyStartedRef.current = true;
		const nextDisplayUrl = URL.createObjectURL(result.file);
		startImageUpload({
			sourceFile: cropSourceFile ?? undefined,
			sourceObjectKey: cropSourceKey,
			displayFile: result.file,
			crop: result.crop,
			nextDisplayUrl,
		});

		return nextDisplayUrl;
	}

	function handleImageRemove() {
		if (isUploading) return;
		clearPendingDisplayPreview();
		clearSourcePreview();
		const nextChange = {
			image: null,
			imageSource: null,
			imageCrop: null,
		};
		committedRef.current = nextChange;
		setImage(null);
		setImageSource(null);
		setImageCrop(null);
		setSourceImageSize(null);
		setError(null);
		onImageChange(nextChange);
	}

	function handleSourceImageLoad(event: SyntheticEvent<HTMLImageElement>) {
		const nextSize = {
			width: event.currentTarget.naturalWidth,
			height: event.currentTarget.naturalHeight,
		};
		if (!nextSize.width || !nextSize.height) return;
		setSourceImageSize(nextSize);
		if (!isCropOpen) return;
		setCrop((currentCrop) =>
			isSquareProfileImageCrop(currentCrop, nextSize)
				? currentCrop
				: getCenteredProfileImageCrop(nextSize),
		);
	}

	function handleCropPointerDown(event: PointerEvent<HTMLButtonElement>) {
		if (!isCropOpen || isCropApplying) return;
		if (event.pointerType === "mouse" && event.button !== 0) return;
		const startCrop = crop;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		cropDragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startCrop,
		};
		didCropDragRef.current = false;
	}

	function handleCropPointerMove(event: PointerEvent<HTMLButtonElement>) {
		const drag = cropDragRef.current;
		if (!drag || drag.pointerId !== event.pointerId || !isCropOpen) return;
		const frameSize = Math.max(imageFrameSize, 1);
		const deltaX = event.clientX - drag.startX;
		const deltaY = event.clientY - drag.startY;
		if (deltaX === 0 && deltaY === 0) return;
		didCropDragRef.current = true;
		event.preventDefault();
		setCrop({
			...drag.startCrop,
			x: clamp(
				drag.startCrop.x - (deltaX / frameSize) * drag.startCrop.width,
				0,
				100 - drag.startCrop.width,
			),
			y: clamp(
				drag.startCrop.y - (deltaY / frameSize) * drag.startCrop.height,
				0,
				100 - drag.startCrop.height,
			),
		});
	}

	function handleCropPointerEnd(event: PointerEvent<HTMLButtonElement>) {
		const drag = cropDragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		cropDragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	function handleImageButtonClick(event: MouseEvent<HTMLButtonElement>) {
		if (isCropOpen) {
			event.preventDefault();
			return;
		}
		if (didCropDragRef.current) {
			event.preventDefault();
			didCropDragRef.current = false;
			return;
		}
		inputRef.current?.click();
	}

	const sourceImageUrl = imageSource
		? getProfileImageUrl(imageSource, imageVersion)
		: image;
	const renderedImageUrl = pendingDisplayUrl
		? pendingDisplayUrl
		: isCropOpen
			? (cropSourceUrl ?? sourceImageUrl)
			: sourceImageUrl;
	const renderedCrop = isCropOpen ? crop : imageCrop;
	const canRenderCropGeometry = Boolean(
		renderedImageUrl &&
			!pendingDisplayUrl &&
			sourceImageSize &&
			renderedCrop &&
			isSquareProfileImageCrop(renderedCrop, sourceImageSize),
	);
	const imageStyle =
		canRenderCropGeometry && renderedCrop
			? getProfileImageCropImageStyle(renderedCrop)
			: undefined;
	const imageContent =
		image || mode === "view" ? (
			<img
				className="size-full object-cover transition-transform duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-105 motion-reduce:transition-none"
				src={image ?? DEFAULT_IMAGE_DATA_URL}
				alt="Profile"
				loading="eager"
			/>
		) : mode === "edit" ? (
			<div>
				<HugeiconsIcon
					icon={CircleArrowOutUpRightIcon}
					className="2xl:size-9 text-gray-bright"
					strokeWidth={2.5}
				/>
			</div>
		) : null;
	const imageFrameClassName = `flex size-28 items-center justify-center rounded-full bg-secondary/80 text-sm font-medium text-muted-foreground/60 ${layoutClasses.image}`;
	const imageClassName = `${imageFrameClassName} overflow-hidden`;

	if (mode !== "edit") {
		return <div className={imageClassName}>{imageContent}</div>;
	}

	return (
		<div className="flex flex-col items-start gap-3">
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				hidden
				onChange={handleImageChange}
			/>
			<div
				className={`group/image relative isolate ${isCropOpen ? "z-50" : "z-0"}`}
				data-profile-crop-open={isCropOpen ? "true" : undefined}
			>
				<button
					ref={imageFrameRef}
					type="button"
					aria-label="Change profile image"
					disabled={isUploading}
					className={`${imageFrameClassName} relative overflow-visible transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${isUploading ? "cursor-default" : isCropOpen ? "cursor-grab touch-none" : "hover:bg-muted active:scale-[0.97]"} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}
					onClick={handleImageButtonClick}
					onPointerDown={handleCropPointerDown}
					onPointerMove={handleCropPointerMove}
					onPointerUp={handleCropPointerEnd}
					onPointerCancel={handleCropPointerEnd}
				>
					<div
						className={`absolute inset-0 rounded-full ${isCropOpen ? "overflow-visible" : "overflow-hidden"}`}
					>
						{renderedImageUrl ? (
							<img
								className={`${imageStyle ? "" : "size-full object-cover"} rounded-lg ${isCropOpen ? "smooth-shadow-lg" : ""}`}
								style={imageStyle}
								src={renderedImageUrl}
								alt="Profile"
								loading="eager"
								onLoad={handleSourceImageLoad}
							/>
						) : (
							<div>
								<HugeiconsIcon
									icon={CircleArrowOutUpRightIcon}
									className="text-gray-bright 2xl:size-9"
									strokeWidth={2.5}
								/>
							</div>
						)}
					</div>
					{renderedImageUrl ? (
						<span
							className={`pointer-events-none absolute inset-0 rounded-full bg-black/25 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${isCropOpen ? "opacity-0" : "opacity-0 group-hover/image:opacity-100"}`}
						/>
					) : (
						<div>
							<HugeiconsIcon
								icon={CircleArrowOutUpRightIcon}
								className="text-gray-bright 2xl:size-9"
								strokeWidth={2.5}
							/>
						</div>
					)}
				</button>
				{image && !isUploading ? (
					<>
						<Button
							ref={cropButtonRef}
							type="button"
							variant="ghost"
							size="icon-sm"
							data-profile-crop-apply="true"
							aria-label={
								isCropOpen ? "Apply profile image crop" : "Crop profile image"
							}
							disabled={isCropApplying || (isCropOpen && !sourceImageSize)}
							onClick={() => {
								if (isCropOpen) {
									cropApplyRequestRef.current?.();
									return;
								}
								openExistingCrop();
							}}
							className={`absolute top-0 left-0 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-md transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 motion-reduce:transition-none ${isCropOpen ? "z-[60] !border-0 !bg-profile-image-crop-action !text-white opacity-100 hover:!bg-profile-image-crop-action" : "opacity-0 group-hover/image:scale-100 group-hover/image:opacity-100"} ${layoutClasses.imageCrop}`}
						>
							<CropIcon className="size-5 stroke-3" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Remove profile image"
							disabled={isUploading || isCropOpen}
							tabIndex={isCropOpen ? -1 : undefined}
							onClick={handleImageRemove}
							className={`absolute top-0 right-0 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-md transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 motion-reduce:transition-none ${isCropOpen ? "invisible pointer-events-none !opacity-0" : "opacity-0 group-hover/image:scale-100 group-hover/image:opacity-100"} ${layoutClasses.imageRemove}`}
						>
							<TrashIcon className="size-5 stroke-3" />
						</Button>
					</>
				) : null}
				{cropSourceUrl ? (
					<CropProfileImageDialog
						open={isCropOpen}
						sourceUrl={cropSourceUrl}
						crop={crop}
						sourceSize={sourceImageSize}
						anchorRef={imageFrameRef}
						cropSize={imageFrameSize}
						applyRequestRef={cropApplyRequestRef}
						onOpenChange={handleCropDialogChange}
						onApply={handleCropApply}
						onApplyingChange={setIsCropApplying}
					/>
				) : null}
			</div>
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
