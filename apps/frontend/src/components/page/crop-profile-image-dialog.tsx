import type { ProfileImageCrop } from "@sinabro/api";
import { motion, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useMemo, useState } from "react";
import {
	exportProfileImageCrop,
	getProfileImageCropPixels,
	isSquareProfileImageCrop,
	type ProfileImageCropExport,
	type ProfileImageSourceSize,
} from "@/lib/image/crop-image";

type CropProfileImageDialogProps = {
	open: boolean;
	sourceUrl: string;
	crop: ProfileImageCrop;
	sourceSize: ProfileImageSourceSize | null;
	anchorRef: RefObject<HTMLElement | null>;
	cropSize: number;
	applyRequestRef: { current: (() => void) | null };
	onOpenChange: (open: boolean) => void;
	onApply: (result: ProfileImageCropExport) => string | null;
	onApplyingChange: (isApplying: boolean) => void;
};

function getCropMaskStyle(
	crop: ProfileImageCrop,
	cropSize: number,
	sourceSize: ProfileImageSourceSize | null,
) {
	if (!sourceSize || !isSquareProfileImageCrop(crop, sourceSize)) return null;

	const mediaWidth = cropSize * (100 / crop.width);
	const mediaHeight = cropSize * (100 / crop.height);
	const mediaLeft = -cropSize * (crop.x / crop.width);
	const mediaTop = -cropSize * (crop.y / crop.height);
	const cropRadius = cropSize / 2;
	const maskImage = `radial-gradient(circle ${cropRadius}px at ${-mediaLeft + cropRadius}px ${-mediaTop + cropRadius}px, transparent 0 ${Math.max(cropRadius - 1, 0)}px, black ${cropRadius + 1}px)`;

	return {
		left: mediaLeft,
		top: mediaTop,
		width: mediaWidth,
		height: mediaHeight,
		backgroundColor: "rgb(255 255 255 / 0.35)",
		maskImage,
		WebkitMaskImage: maskImage,
	};
}

export function CropProfileImageDialog({
	open,
	sourceUrl,
	crop,
	sourceSize,
	anchorRef,
	cropSize,
	applyRequestRef,
	onOpenChange,
	onApply,
	onApplyingChange,
}: CropProfileImageDialogProps) {
	const shouldReduceMotion = useReducedMotion();
	const [isApplying, setIsApplying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const cropMaskStyle = useMemo(
		() => getCropMaskStyle(crop, cropSize, sourceSize),
		[crop, cropSize, sourceSize],
	);

	useEffect(() => {
		if (!open) return;
		setIsApplying(false);
		setError(null);
	}, [open]);

	useEffect(() => {
		onApplyingChange(isApplying);
		return () => onApplyingChange(false);
	}, [isApplying, onApplyingChange]);

	useEffect(() => {
		return () => {
			applyRequestRef.current = null;
		};
	}, [applyRequestRef]);

	useEffect(() => {
		if (!open) return;
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape" || isApplying) return;
			event.preventDefault();
			onOpenChange(false);
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isApplying, onOpenChange, open]);

	useEffect(() => {
		if (!open) return;
		function handleOutsidePointerDown(event: PointerEvent) {
			if (isApplying) return;
			const target = event.target;
			if (
				target instanceof Element &&
				target.closest("[data-profile-crop-apply]")
			) {
				return;
			}
			if (target instanceof Node && anchorRef.current?.contains(target)) {
				return;
			}
			onOpenChange(false);
		}
		document.addEventListener("pointerdown", handleOutsidePointerDown, true);
		return () =>
			document.removeEventListener(
				"pointerdown",
				handleOutsidePointerDown,
				true,
			);
	}, [anchorRef, isApplying, onOpenChange, open]);

	async function handleApply() {
		if (!sourceSize || isApplying) return;
		setIsApplying(true);
		setError(null);
		try {
			const result = await exportProfileImageCrop({
				sourceUrl,
				croppedAreaPixels: getProfileImageCropPixels(crop, sourceSize),
				croppedAreaPercentages: crop,
			});
			const nextPreviewUrl = onApply(result);
			if (!nextPreviewUrl) return;
			onOpenChange(false);
		} catch (applyError) {
			setError(
				applyError instanceof Error
					? applyError.message
					: "Unable to crop the profile image.",
			);
		} finally {
			setIsApplying(false);
		}
	}

	applyRequestRef.current = () => {
		void handleApply();
	};

	return (
		<motion.div
			initial={false}
			animate={open ? { opacity: 1 } : { opacity: 0 }}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: { duration: open ? 0.12 : 0.08, ease: "easeOut" }
			}
			className={`pointer-events-none absolute inset-0 z-40 overflow-visible ${open ? "" : "invisible"}`}
			role="region"
			aria-label="Crop profile image"
		>
			{cropMaskStyle ? (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute z-10"
					style={cropMaskStyle}
				/>
			) : null}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 z-20 rounded-full border-[3px] border-black shadow-none"
			/>
			{error ? (
				<p className="absolute top-1/2 right-0 z-30 translate-x-[calc(100%+0.75rem)] -translate-y-1/2 bg-background p-2 text-center text-xs font-medium text-destructive/80">
					{error}
				</p>
			) : null}
		</motion.div>
	);
}
