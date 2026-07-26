import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Upload3 } from "reicon-react";
import {
	getProfileImageUrl,
	uploadPageImage,
} from "@/lib/api/profile-image-api";

type PageImageEditorProps = {
	initialImage: string | null;
	handle: string;
	mode: "view" | "edit";
	onImageChange: (image: string) => void;
};

export function PageImageEditor({
	initialImage,
	handle,
	mode,
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

	const imageContent = image ? (
		<img
			className="size-full object-cover"
			src={image}
			alt="Profile"
			loading="eager"
		/>
	) : mode === "edit" ? (
		<div>
			<Upload3 weight="Filled" className="" size={32} />
		</div>
	) : null;
	const imageClassName =
		"flex size-28 items-center justify-center overflow-hidden rounded-full bg-secondary/80 text-sm font-medium text-muted-foreground/60 sm:size-32 xl:size-46";

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
				<button
					type="button"
					aria-label="Change profile image"
					disabled={isUploading}
					className={`${imageClassName} transition-transform duration-150 ease-out hover:bg-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}
					onClick={() => inputRef.current?.click()}
				>
					{imageContent}
				</button>
			) : (
				<div className={imageClassName}>{imageContent}</div>
			)}
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
