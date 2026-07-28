import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

function MediaAction({
	href,
	label,
}: {
	href: string | undefined;
	label: string;
}) {
	if (!href) {
		return null;
	}

	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="pointer-events-auto inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-black/70 px-3 text-xs font-medium text-white transition-colors hover:bg-black/80"
		>
			{label}
		</a>
	);
}

export function MediaItemRenderer({
	item,
	preset,
	mode,
	onCommand,
}: ItemRendererProps<GridItemByType<"media">>) {
	const isVideo = item.data.mimeType.startsWith("video/");
	const hasMedia = Boolean(item.data.mediaUrl);

	return (
		<div className="relative size-full overflow-hidden bg-muted">
			{hasMedia ? (
				isVideo ? (
					<video
						src={item.data.mediaUrl}
						autoPlay
						muted
						loop
						playsInline
						className="size-full object-cover"
					/>
				) : (
					<img
						src={item.data.mediaUrl}
						alt={item.data.caption ?? "Media item"}
						className="size-full object-cover"
					/>
				)
			) : (
				<div className="flex size-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
					Media preview unavailable
				</div>
			)}
			<div
				className={cn(
					"pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 text-white",
					preset === "squareSmall" ? "min-h-24" : "min-h-28",
				)}
			>
				<p
					contentEditable={mode === "edit"}
					suppressContentEditableWarning
					onBlur={(event) => {
						if (!onCommand) return;
						onCommand({
							type: "update-data",
							itemId: item.id,
							data: {
								...item.data,
								caption: event.currentTarget.textContent ?? "",
							},
						});
					}}
					className="min-w-0 flex-1 truncate text-xs font-medium"
				>
					{item.data.caption?.trim() || (isVideo ? "Video" : "Image")}
				</p>
				<MediaAction href={item.data.mediaUrl} label="Open" />
			</div>
		</div>
	);
}
