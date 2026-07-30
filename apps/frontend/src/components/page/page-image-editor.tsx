import { TrashIcon } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Loader, Upload3 } from "reicon-react";
import { Button } from "@/components/ui/button";
import {
	getProfileImageUrl,
	uploadPageImage,
} from "@/lib/api/profile-image-api";
import type { Breakpoint } from "@/lib/grid/types";
import { getPageLayoutClasses } from "@/lib/page/page-layout";

const DEFAULT_PROFILE_IMAGE =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='oklch(0.97%200%200)'/%3E%3C/svg%3E";

type PageImageEditorProps = {
	initialImage: string | null;
	handle: string;
	mode: "view" | "edit";
	breakpoint: Breakpoint;
	onImageChange: (image: string | null) => void;
};

export function PageImageEditor({
	initialImage,
	handle,
	mode,
	breakpoint,
	onImageChange,
}: PageImageEditorProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [image, setImage] = useState(getProfileImageUrl(initialImage));
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setImage(getProfileImageUrl(initialImage));
	}, [initialImage]);

	useEffect(() => {
		return () => {
			if (image?.startsWith("blob:")) {
				URL.revokeObjectURL(image);
			}
		};
	}, [image]);

	async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		const previewUrl = URL.createObjectURL(file);
		setImage(previewUrl);
		setError(null);
		setIsUploading(true);

		try {
			const uploadedImage = await uploadPageImage(handle, file);
			onImageChange(uploadedImage.key);
			setImage(uploadedImage.url ?? previewUrl);
		} catch (uploadError) {
			setImage(getProfileImageUrl(initialImage));
			setError(
				uploadError instanceof Error
					? uploadError.message
					: "Image upload failed.",
			);
			URL.revokeObjectURL(previewUrl);
		} finally {
			setIsUploading(false);
			event.target.value = "";
		}
	}

	function handleImageRemove() {
		setImage(null);
		setError(null);
		onImageChange(null);
	}

	const imageContent =
		image || mode === "view" ? (
			<img
				className="size-full object-cover transition-transform duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-105 motion-reduce:transition-none"
				src={image ?? DEFAULT_PROFILE_IMAGE}
				alt="Profile"
				loading="eager"
			/>
		) : mode === "edit" ? (
			<div>
				<Upload3 weight="Filled" className="" size={32} />
			</div>
		) : null;
	const layoutClasses = getPageLayoutClasses(breakpoint);
	const imageClassName = `flex size-28 items-center justify-center overflow-hidden rounded-full bg-secondary/80 text-sm font-medium text-muted-foreground/60 ${layoutClasses.image}`;

	return (
		<div className="flex flex-col items-start gap-3">
			{mode === "edit" ? (
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					hidden
					onChange={handleImageChange}
				/>
			) : null}
			{mode === "edit" ? (
				<div className="group/image relative isolate">
					<button
						type="button"
						aria-label="Change profile image"
						disabled={isUploading}
						className={`${imageClassName} relative transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}
						onClick={() => inputRef.current?.click()}
					>
						{imageContent}
						{image ? (
							<span
								className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 text-white transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${isUploading ? "opacity-100" : "opacity-0 group-hover/image:opacity-100 group-focus-within/image:opacity-100"}`}
							>
								{isUploading ? (
									<Loader className="size-8 animate-spin" />
								) : null}
							</span>
						) : null}
					</button>
					{image && !isUploading ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Remove profile image"
							disabled={isUploading}
							onClick={handleImageRemove}
							className={`absolute top-0 right-0 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background opacity-0 shadow-md transition-[opacity,transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/image:scale-100 group-hover/image:opacity-100 group-focus-within/image:scale-100 group-focus-within/image:opacity-100 active:scale-95 motion-reduce:transition-none ${layoutClasses.imageRemove}`}
						>
							<TrashIcon className="size-5 stroke-3" />
						</Button>
					) : null}
				</div>
			) : (
				<div className={imageClassName}>{imageContent}</div>
			)}
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
