import type { ChangeEvent } from "react";

type EditableParagraphProps = {
	value: string | null;
	placeholder: string;
	mode: "view" | "edit";
	className?: string;
	onChange: (value: string) => void;
	rows?: number;
	spellCheck?: boolean;
};

export function EditableParagraph({
	value,
	placeholder,
	mode,
	className,
	onChange,
	rows = 2,
	spellCheck,
}: EditableParagraphProps) {
	const sharedClassName = `editable-paragraph field-sizing-content min-h-fit w-full resize-none overflow-hidden whitespace-pre-wrap outline-none transition-[background-color,box-shadow] duration-150 ease-out ${className ?? "text-base leading-6"}`;

	if (mode === "view") {
		return (
			<p
				className={`${sharedClassName} cursor-default caret-transparent`}
				data-empty={!value?.trim()}
			>
				{value}
			</p>
		);
	}

	const sharedProps = {
		className: sharedClassName,
		"data-empty": !value?.trim(),
		placeholder,
		value: value ?? "",
		spellCheck,
		onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			onChange(event.currentTarget.value),
	};

	return <textarea {...sharedProps} rows={rows} />;
}
