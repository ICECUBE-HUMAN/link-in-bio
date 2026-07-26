import type { ChangeEvent } from "react";

type EditableParagraphProps = {
	value: string | null;
	placeholder: string;
	className?: string;
	onChange: (value: string) => void;
	rows?: number;
};

export function EditableParagraph({
	value,
	placeholder,
	className,
	onChange,
	rows = 2,
}: EditableParagraphProps) {
	const sharedProps = {
		className: `editable-paragraph field-sizing-content min-h-fit w-full resize-none overflow-hidden outline-none transition-[background-color,box-shadow] duration-150 ease-out ${className ?? "text-base leading-6"}`,
		"data-empty": !value?.trim(),
		placeholder,
		value: value ?? "",
		onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			onChange(event.currentTarget.value),
	};

	return <textarea {...sharedProps} rows={rows} />;
}
