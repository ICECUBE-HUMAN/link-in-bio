import { ExternalLink } from "lucide-react";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

const textClampClassByPreset = {
	fullBanner: "line-clamp-1",
	halfBanner: "line-clamp-2",
	squareSmall: "line-clamp-5",
	landscape: "line-clamp-6",
	squareLarge: "line-clamp-[10]",
	portrait: "line-clamp-[12]",
} as const;

const textSizeClassByPreset = {
	fullBanner: "text-lg leading-7",
	halfBanner: "text-lg leading-6",
	squareSmall: "text-lg leading-6",
	landscape: "text-lg leading-6",
	squareLarge: "text-lg leading-7",
	portrait: "text-lg leading-6",
} as const;

export function TextItemRenderer({
	item,
	mode,
	preset,
	onCommand,
}: ItemRendererProps<GridItemByType<"text">>) {
	const isEditing = mode === "edit";

	return (
		<div className="flex size-full min-h-0 flex-col gap-3 p-4">
			<div className="flex min-h-0 flex-1 items-start justify-between gap-3">
				{isEditing ? (
					<textarea
						rows={1}
						value={item.data.text}
						onChange={(event) =>
							onCommand?.({
								type: "update-data",
								itemId: item.id,
								data: { ...item.data, text: event.target.value },
							})
						}
						className={cn(
							"min-w-0 flex-1 resize-none overflow-x-auto overflow-y-hidden whitespace-nowrap bg-transparent text-foreground/90 outline-none",
							textSizeClassByPreset[preset],
							"h-7 py-0 leading-7",
						)}
					/>
				) : (
					<div
						className={cn(
							"min-h-0 min-w-0 flex-1 whitespace-pre-wrap text-foreground/90",
							textSizeClassByPreset[preset],
							textClampClassByPreset[preset],
						)}
					>
						{item.data.text}
					</div>
				)}
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
