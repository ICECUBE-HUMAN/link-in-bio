import { ExternalLink } from "lucide-react";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

const textClampClassByPreset = {
	fullBanner: "line-clamp-1",
	halfBanner: "line-clamp-2",
	squareSmall: "line-clamp-5",
	landscape: "line-clamp-3",
	squareLarge: "line-clamp-[10]",
	portrait: "line-clamp-[12]",
} as const;

const textSizeClassByPreset = {
	fullBanner: "text-xl leading-9",
	halfBanner: "text-xl leading-9",
	squareSmall: "text-xl leading-9",
	landscape: "text-xl leading-9",
	squareLarge: "text-xl leading-9",
	portrait: "text-xl leading-9",
} as const;

export function TextItemRenderer({
	item,
	mode,
	preset,
	onCommand,
}: ItemRendererProps<GridItemByType<"text">>) {
	const isEditing = mode === "edit";

	return (
		<div className="flex size-full min-h-0 flex-col gap-3 p-3">
			<div className="flex min-h-0 flex-1 items-start justify-between gap-3">
				{isEditing ? (
          <textarea
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
								data: { ...item.data, text: event.target.value },
							})
						}
						className={cn(
							"min-h-0 min-w-0 flex-1 resize-none whitespace-pre-wrap bg-transparent text-foreground/90 outline-none rounded-lg p-1",
							textSizeClassByPreset[preset],
              "h-full overflow-y-auto placeholder:text-input",
							"hover:bg-muted focus-visible:bg-muted",
						)}
					/>
				) : (
					<div
						className={cn(
							"min-h-0 min-w-0 flex-1 whitespace-pre-line text-ellipsis text-foreground/90",
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
