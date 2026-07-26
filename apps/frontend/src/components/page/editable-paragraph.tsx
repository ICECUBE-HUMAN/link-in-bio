import { useRef } from "react";

type EditableParagraphProps = {
	initialValue: string | null;
	placeholder: string;
	className?: string;
};

export function EditableParagraph({
	initialValue,
	placeholder,
	className,
}: EditableParagraphProps) {
	const valueRef = useRef(initialValue ?? "");

	return (
		<p
			className={`editable-paragraph min-h-6 rounded-md outline-none transition-[background-color,box-shadow] duration-150 ease-out ${className ?? "text-base leading-6"}`}
			contentEditable
			data-empty={!initialValue?.trim()}
			data-placeholder={placeholder}
			suppressContentEditableWarning
			onInput={(event) => {
				const value = event.currentTarget.textContent ?? "";
				valueRef.current = value;
				event.currentTarget.dataset.empty = String(!value.trim());
			}}
		>
			{initialValue}
		</p>
	);
}
