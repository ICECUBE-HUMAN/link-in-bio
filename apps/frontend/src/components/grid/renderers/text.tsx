import { ExternalLink } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

type TextAlign = "left" | "center" | "right";
type VerticalAlign = "top" | "center" | "bottom";

const textAlignValues = ["left", "center", "right"] as const;
const verticalAlignValues = ["top", "center", "bottom"] as const;

function getTextStyleValue<T extends string>(
	style: Record<string, string | number | boolean | null>,
	key: string,
	values: readonly T[],
	fallback: T,
): T {
	const value = style[key];
	return typeof value === "string" && values.includes(value as T)
		? (value as T)
		: fallback;
}

const verticalAlignClassByValue: Record<VerticalAlign, string> = {
	top: "justify-start",
	center: "justify-center",
	bottom: "justify-end",
};

function syncTextareaVerticalAlign(
	textarea: HTMLTextAreaElement,
	verticalAlign: VerticalAlign,
) {
	const computedStyle = window.getComputedStyle(textarea);
	const basePadding = Number.parseFloat(computedStyle.paddingBottom);

	textarea.style.paddingTop = `${basePadding}px`;
	if (verticalAlign === "top") return;

	const contentHeight = textarea.scrollHeight - basePadding * 2;
	const availableHeight =
		textarea.clientHeight - basePadding * 2 - contentHeight;
	const extraPadding =
		Math.max(0, availableHeight) * (verticalAlign === "center" ? 0.5 : 1);

	textarea.style.paddingTop = `${basePadding + extraPadding}px`;
}

const textClampClassByPreset = {
	fullBanner: "line-clamp-1",
	halfBanner: "line-clamp-2",
	squareSmall: "line-clamp-5",
	landscape: "line-clamp-3",
	squareLarge: "line-clamp-[10]",
	portrait: "line-clamp-[12]",
} as const;

const textSizeClassByPreset = {
	fullBanner: "text-lg leading-7",
	halfBanner: "text-lg leading-8.5",
	squareSmall: "text-lg leading-7",
	landscape: "text-lg leading-7",
	squareLarge: "text-lg leading-8",
	portrait: "text-lg leading-8",
} as const;

export function TextItemRenderer({
	item,
	mode,
	preset,
	onCommand,
}: ItemRendererProps<GridItemByType<"text">>) {
	const isEditing = mode === "edit";
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const textAlign = getTextStyleValue<TextAlign>(
		item.style,
		"textAlign",
		textAlignValues,
		"left",
	);
	const verticalAlign = getTextStyleValue<VerticalAlign>(
		item.style,
		"verticalAlign",
		verticalAlignValues,
		"top",
	);

	useLayoutEffect(() => {
		if (!isEditing) return;
		const textarea = textareaRef.current;
		if (!textarea) return;

		const updateTextareaPadding = () => {
			syncTextareaVerticalAlign(textarea, verticalAlign);
		};

		updateTextareaPadding();
		const resizeObserver = new ResizeObserver(updateTextareaPadding);
		resizeObserver.observe(textarea);

		return () => resizeObserver.disconnect();
	}, [isEditing, item.data.text, verticalAlign]);

	return (
		<div className="flex size-full min-h-0 flex-col gap-3 p-3">
			<div className="flex min-h-0 flex-1 items-stretch justify-between gap-3">
				<div
					className={cn(
						"flex min-h-0 min-w-0 flex-1 flex-col",
						verticalAlignClassByValue[verticalAlign],
					)}
				>
					{isEditing ? (
						<textarea
							ref={textareaRef}
							autoFocus
							placeholder="Add note..."
							spellCheck={false}
							value={item.data.text}
							onBlur={(event) => {
								event.currentTarget.scrollTo({ top: 0, behavior: "smooth" });
							}}
							onChange={(event) =>
								onCommand?.({
									type: "update-data",
									itemId: item.id,
									data: {
										...item.data,
										text: event.target.value,
									},
								})
							}
							className={cn(
								"min-h-0 min-w-0 flex-1 resize-none whitespace-pre-wrap rounded-lg bg-transparent p-1 px-2 text-foreground/90 outline-none",
								textSizeClassByPreset[preset],
								"h-full overflow-y-auto placeholder:text-input hover:bg-muted focus-visible:bg-muted",
							)}
							style={{ textAlign }}
						/>
					) : (
						<div
							className={cn(
								"min-h-0 min-w-0 whitespace-pre-line text-ellipsis text-foreground/90",
								textSizeClassByPreset[preset],
								textClampClassByPreset[preset],
							)}
							style={{ textAlign }}
						>
							{item.data.text}
						</div>
					)}
				</div>
				{item.data.link ? (
					<a
						href={item.data.link}
						target="_blank"
						rel="noreferrer"
						aria-label="Open text link"
						className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground transition-colors hover:text-foreground"
					>
						<ExternalLink className="size-4" />
					</a>
				) : null}
			</div>
		</div>
	);
}
