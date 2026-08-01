import type { ProfileImageCrop } from "@sinabro/api";
import { CropIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import Cropper, {
	type Area,
	getInitialCropFromCroppedAreaPercentages,
	type Point,
} from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
	exportProfileImageCrop,
	type ProfileImageCropExport,
} from "@/lib/image/crop-image";

type CropProfileImageDialogProps = {
	open: boolean;
	sourceUrl: string;
	initialCrop: ProfileImageCrop | null;
	anchorRef: RefObject<HTMLElement | null>;
	cropButtonRef: RefObject<HTMLElement | null>;
	cropButtonClassName: string;
	cropSize: number;
	applyRequestRef: { current: (() => void) | null };
	onOpenChange: (open: boolean) => void;
	onApply: (result: ProfileImageCropExport) => string | null;
};

type LocalRect = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

type AnchorLayout = {
	anchorRect: LocalRect;
	cropButtonOffset: { left: number; top: number };
};

function readAnchorLayout(
	anchor: HTMLElement | null,
	cropButton: HTMLElement | null,
): AnchorLayout | null {
	if (!anchor) return null;

	const anchorRect = anchor.getBoundingClientRect();
	const nextAnchorRect = {
		left: anchorRect.left,
		top: anchorRect.top,
		right: anchorRect.right,
		bottom: anchorRect.bottom,
	};
	const cropButtonRect = cropButton?.getBoundingClientRect();

	return {
		anchorRect: nextAnchorRect,
		cropButtonOffset: cropButtonRect
			? {
					left: cropButtonRect.left - anchorRect.left,
					top: cropButtonRect.top - anchorRect.top,
				}
			: { left: 0, top: 0 },
	};
}

type CropMaskStyle = {
	left: number;
	top: number;
	width: number;
	height: number;
	backgroundColor: string;
	maskImage: string;
	WebkitMaskImage: string;
};

function getCropMaskStyle(
	mediaBounds: LocalRect,
	cropBounds: LocalRect,
): CropMaskStyle {
	const mediaWidth = mediaBounds.right - mediaBounds.left;
	const mediaHeight = mediaBounds.bottom - mediaBounds.top;
	const cropCenterX =
		(cropBounds.left + cropBounds.right) / 2 - mediaBounds.left;
	const cropCenterY =
		(cropBounds.top + cropBounds.bottom) / 2 - mediaBounds.top;
	const cropRadius =
		Math.min(
			cropBounds.right - cropBounds.left,
			cropBounds.bottom - cropBounds.top,
		) / 2;
	const maskImage = `radial-gradient(circle ${cropRadius}px at ${cropCenterX}px ${cropCenterY}px, transparent 0 ${Math.max(cropRadius - 1, 0)}px, black ${cropRadius + 1}px)`;

	return {
		left: mediaBounds.left,
		top: mediaBounds.top,
		width: mediaWidth,
		height: mediaHeight,
		backgroundColor: "rgb(255 255 255 / 0.35)",
		maskImage,
		WebkitMaskImage: maskImage,
	};
}

const DEFAULT_CROP = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
} satisfies ProfileImageCrop;

export function CropProfileImageDialog({
	open,
	sourceUrl,
	initialCrop,
	anchorRef,
	cropButtonRef,
	cropButtonClassName,
	cropSize,
	applyRequestRef,
	onOpenChange,
	onApply,
}: CropProfileImageDialogProps) {
	const shouldReduceMotion = useReducedMotion();
	const stageRef = useRef<HTMLDivElement>(null);
	const cropMaskRef = useRef<HTMLSpanElement>(null);
	const syncFrameRef = useRef<number | null>(null);
	const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [croppedAreaPercentages, setCroppedAreaPercentages] =
		useState<ProfileImageCrop>(initialCrop ?? DEFAULT_CROP);
	const [isApplying, setIsApplying] = useState(false);
	const [mediaBounds, setMediaBounds] = useState<LocalRect | null>(null);
	const [cropBounds, setCropBounds] = useState<LocalRect | null>(null);
	const [anchorRect, setAnchorRect] = useState<LocalRect | null>(null);
	const [cropButtonOffset, setCropButtonOffset] = useState({ left: 0, top: 0 });
	const [error, setError] = useState<string | null>(null);
	const immediateAnchorLayout = open
		? readAnchorLayout(anchorRef.current, cropButtonRef.current)
		: null;
	const renderedAnchorRect = open
		? (immediateAnchorLayout?.anchorRect ?? null)
		: anchorRect;
	const renderedCropButtonOffset =
		immediateAnchorLayout?.cropButtonOffset ?? cropButtonOffset;
	const renderedCropSize = immediateAnchorLayout
		? Math.round(
				immediateAnchorLayout.anchorRect.right -
					immediateAnchorLayout.anchorRect.left,
			)
		: cropSize;
	const stageIsOpen = open && renderedAnchorRect !== null;
	const cropperKey = [
		sourceUrl,
		renderedCropSize,
		open ? "open" : "closed",
		initialCrop
			? `${initialCrop.x},${initialCrop.y},${initialCrop.width},${initialCrop.height}`
			: "default",
	].join(":");

	useEffect(() => {
		if (!open) return;
		if (!initialCrop) {
			setCrop({ x: 0, y: 0 });
		}
		setCroppedAreaPixels(null);
		setCroppedAreaPercentages(initialCrop ?? DEFAULT_CROP);
		setIsApplying(false);
		setMediaBounds(null);
		setCropBounds(null);
		setError(null);
	}, [initialCrop, open]);

	useLayoutEffect(() => {
		if (!open) {
			setAnchorRect(null);
			setCropButtonOffset({ left: 0, top: 0 });
			return;
		}
		const updateAnchorRect = () => {
			const anchor = anchorRef.current;
			if (!anchor) return;
			const rect = anchor.getBoundingClientRect();
			setAnchorRect({
				left: rect.left,
				top: rect.top,
				right: rect.right,
				bottom: rect.bottom,
			});
			const cropButton = cropButtonRef.current;
			if (cropButton) {
				const cropButtonRect = cropButton.getBoundingClientRect();
				setCropButtonOffset({
					left: cropButtonRect.left - rect.left,
					top: cropButtonRect.top - rect.top,
				});
			}
		};
		updateAnchorRect();
		window.addEventListener("resize", updateAnchorRect);
		window.addEventListener("scroll", updateAnchorRect, true);
		const observer = new ResizeObserver(updateAnchorRect);
		if (anchorRef.current) observer.observe(anchorRef.current);
		return () => {
			window.removeEventListener("resize", updateAnchorRect);
			window.removeEventListener("scroll", updateAnchorRect, true);
			observer.disconnect();
		};
	}, [anchorRef, cropButtonRef, open]);

	const syncImageBounds = useCallback(() => {
		const stage = stageRef.current;
		if (!stage) return;
		const stageRect = stage.getBoundingClientRect();
		const media = stage.querySelector<HTMLElement>(".reactEasyCrop_Image");
		const cropArea = stage.querySelector<HTMLElement>(
			".reactEasyCrop_CropArea",
		);
		if (!media || !cropArea) return;

		const toLocalRect = (element: HTMLElement): LocalRect => {
			const rect = element.getBoundingClientRect();
			return {
				left: rect.left - stageRect.left,
				top: rect.top - stageRect.top,
				right: rect.right - stageRect.left,
				bottom: rect.bottom - stageRect.top,
			};
		};

		const nextMediaBounds = toLocalRect(media);
		const nextCropBounds = toLocalRect(cropArea);
		const nextMaskStyle = getCropMaskStyle(nextMediaBounds, nextCropBounds);
		const mask = cropMaskRef.current;
		if (mask) {
			mask.style.left = `${nextMaskStyle.left}px`;
			mask.style.top = `${nextMaskStyle.top}px`;
			mask.style.width = `${nextMaskStyle.width}px`;
			mask.style.height = `${nextMaskStyle.height}px`;
			mask.style.backgroundColor = nextMaskStyle.backgroundColor;
			mask.style.maskImage = nextMaskStyle.maskImage;
			mask.style.setProperty(
				"-webkit-mask-image",
				nextMaskStyle.WebkitMaskImage,
			);
		}
		setMediaBounds(nextMediaBounds);
		setCropBounds(nextCropBounds);
	}, []);

	const scheduleImageBoundsSync = useCallback(() => {
		if (syncFrameRef.current !== null) return;
		syncFrameRef.current = window.requestAnimationFrame(() => {
			syncFrameRef.current = null;
			syncImageBounds();
		});
	}, [syncImageBounds]);
	const cropMaskStyle =
		mediaBounds && cropBounds
			? getCropMaskStyle(mediaBounds, cropBounds)
			: null;

	useEffect(() => {
		if (!open) return;
		const frame = window.requestAnimationFrame(syncImageBounds);
		const timeout = window.setTimeout(syncImageBounds, 0);
		const observer = new ResizeObserver(syncImageBounds);
		if (stageRef.current) observer.observe(stageRef.current);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(timeout);
			observer.disconnect();
		};
	}, [open, syncImageBounds]);

	useEffect(() => {
		return () => {
			if (syncFrameRef.current !== null) {
				window.cancelAnimationFrame(syncFrameRef.current);
			}
		};
	}, []);

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

	async function handleApply() {
		if (!croppedAreaPixels || isApplying) return;
		setIsApplying(true);
		setError(null);
		try {
			const result = await exportProfileImageCrop({
				sourceUrl,
				croppedAreaPixels,
				croppedAreaPercentages,
			});
			const nextPreviewUrl = onApply(result);
			if (!nextPreviewUrl) {
				setIsApplying(false);
				return;
			}
			setIsApplying(false);
			onOpenChange(false);
		} catch (applyError) {
			setIsApplying(false);
			setError(
				applyError instanceof Error
					? applyError.message
					: "Unable to crop the profile image.",
			);
		}
	}

	applyRequestRef.current = () => {
		void handleApply();
	};

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
			const cropArea = stageRef.current?.querySelector<HTMLElement>(
				".reactEasyCrop_CropArea",
			);
			const rect = cropArea?.getBoundingClientRect();
			if (
				rect &&
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom
			) {
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
	}, [isApplying, onOpenChange, open]);

	const cropStage = (
		<motion.div
			ref={stageRef}
			initial={false}
			animate={
				!stageIsOpen
					? { opacity: 0, y: 0 }
					: shouldReduceMotion
						? { opacity: 1 }
						: { opacity: 1, y: 0 }
			}
			transition={{ duration: 0 }}
			className={`fixed z-[50] overflow-visible ${stageIsOpen ? "pointer-events-auto" : "pointer-events-none"}`}
			style={
				renderedAnchorRect
					? {
							left: renderedAnchorRect.left,
							top: renderedAnchorRect.top,
							width: renderedAnchorRect.right - renderedAnchorRect.left,
							height: renderedAnchorRect.bottom - renderedAnchorRect.top,
						}
					: undefined
			}
			role="region"
			aria-label="Crop profile image"
		>
			<div
				className={`absolute inset-0 overflow-visible ${stageIsOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
			>
				<Cropper
					key={cropperKey}
					image={sourceUrl}
					crop={crop}
					zoom={1}
					minZoom={1}
					maxZoom={1}
					zoomWithScroll={false}
					onWheelRequest={() => false}
					cropSize={{ width: renderedCropSize, height: renderedCropSize }}
					aspect={1}
					cropShape="round"
					objectFit="cover"
					showGrid={false}
					restrictPosition
					initialCroppedAreaPercentages={initialCrop ?? undefined}
					onCropChange={(nextCrop) => {
						setCrop(nextCrop);
						scheduleImageBoundsSync();
					}}
					onCropComplete={(percentages, pixels) => {
						setCroppedAreaPercentages(percentages);
						setCroppedAreaPixels(pixels);
						scheduleImageBoundsSync();
					}}
					onCropAreaChange={(percentages, pixels) => {
						setCroppedAreaPercentages(percentages);
						setCroppedAreaPixels(pixels);
						scheduleImageBoundsSync();
					}}
					onMediaLoaded={(mediaSize) => {
						if (initialCrop) {
							const { crop: initialPosition } =
								getInitialCropFromCroppedAreaPercentages(
									initialCrop,
									mediaSize,
									0,
									{ width: renderedCropSize, height: renderedCropSize },
									1,
									1,
								);
							setCrop(initialPosition);
						}
						scheduleImageBoundsSync();
					}}
					classes={{
						containerClassName:
							"!rounded-full !overflow-visible !bg-transparent",
						mediaClassName: "!rounded-lg smooth-shadow-lg",
						cropAreaClassName:
							"!z-20 !rounded-full !border-[3px] !border-black !shadow-none",
					}}
				/>
				{cropMaskStyle ? (
					<span
						ref={cropMaskRef}
						aria-hidden="true"
						className="pointer-events-none absolute z-10"
						style={cropMaskStyle}
					/>
				) : null}
				{stageIsOpen ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Crop profile image"
						data-profile-crop-apply="true"
						disabled={isApplying}
						onClick={() => applyRequestRef.current?.()}
						style={renderedCropButtonOffset}
						className={`absolute top-0 left-0 z-[60] inline-flex size-10 items-center justify-center !border-0 rounded-full !bg-profile-image-crop-action !text-white shadow-md surface-line hover:!bg-profile-image-crop-action focus-visible:scale-100 focus-visible:opacity-100 ${cropButtonClassName}`}
					>
						<CropIcon className="size-5 stroke-3" />
					</Button>
				) : null}
			</div>
			{error && open ? (
				<p className="absolute -right-30 top-1/2 z-30 -translate-y-1/2 text-center text-xs text-destructive/80 bg-background p-2 font-medium">
					{error}
				</p>
			) : null}
		</motion.div>
	);

	return (
		<>
			{open && typeof document !== "undefined"
				? createPortal(
						<div
							aria-hidden="true"
							data-profile-crop-overlay="true"
							className="pointer-events-auto fixed inset-0 z-[40] bg-transparent"
							onPointerDown={() => onOpenChange(false)}
						/>,
						document.body,
					)
				: null}
			{typeof document !== "undefined"
				? createPortal(cropStage, document.body)
				: cropStage}
		</>
	);
}
