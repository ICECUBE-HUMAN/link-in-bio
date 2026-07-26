import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Upload3 } from "reicon-react";

type PageImageEditorProps = {
	initialImage: string | null;
};

export function PageImageEditor({ initialImage }: PageImageEditorProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [image, setImage] = useState(initialImage);

	useEffect(() => {
		return () => {
			if (image?.startsWith("blob:")) {
				URL.revokeObjectURL(image);
			}
		};
	}, [image]);

	function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		setImage(URL.createObjectURL(file));
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
			<button
				type="button"
				aria-label="Change profile image"
				className="flex size-28 xl:size-46 items-center justify-center overflow-hidden rounded-full bg-secondary/80 text-sm font-medium text-muted-foreground/60 transition-transform duration-150 ease-out hover:bg-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:size-32"
				onClick={() => inputRef.current?.click()}
			>
				{image ? (
					<img className="size-full object-cover" src={image} alt="Profile" />
        ) : (
            <div>
              <Upload3 weight="Filled" className="" size={32} />
            </div>
				)}
			</button>
		</div>
	);
}
