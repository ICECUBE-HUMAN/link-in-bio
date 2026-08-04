import { ItemCaption } from "@/components/grid/item-caption";
import { ItemExternalAction } from "@/components/grid/item-external-action";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import { DEFAULT_IMAGE_DATA_URL } from "@/lib/shared/default-image";
import { cn } from "@/lib/utils";

function MediaAction({ href }: { href: string | undefined }) {
	if (!href) {
		return null;
	}

	return <ItemExternalAction href={href} ariaLabel="Open media" />;
}

export function MediaItemRenderer({
	item,
	mode,
	onCommand,
}: ItemRendererProps<GridItemByType<"media">>) {
	const isVideo = item.data.mimeType.startsWith("video/");
	const linkedUrl = item.data.link;

	return (
		<div className="relative size-full overflow-hidden rounded-[inherit] bg-muted/30 surface-line">
			{isVideo ? (
				<video
					src={item.data.mediaUrl ?? DEFAULT_IMAGE_DATA_URL}
					autoPlay
					muted
					loop
					playsInline
					className="pointer-events-none size-full object-cover"
				/>
			) : (
				<img
					src={item.data.mediaUrl ?? DEFAULT_IMAGE_DATA_URL}
					alt={item.data.caption ?? "Media item"}
					className="size-full object-cover"
				/>
			)}
			<div
				className={cn(
					"pointer-events-none absolute inset-x-0 bottom-0 flex min-w-0 items-center justify-between gap-3 p-4 text-white",
					// preset === "squareSmall" ? "min-h-24" : "min-h-28",
				)}
			>
				<ItemCaption
					mode={mode}
					value={item.data.caption}
					onChange={(caption) =>
						onCommand?.({
							type: "update-data",
							itemId: item.id,
							data: { ...item.data, caption },
						})
					}
				/>
				{linkedUrl ? (
					<div className="pointer-events-auto flex h-fit shrink-0 items-center">
						<MediaAction href={linkedUrl} />
					</div>
				) : null}
			</div>
		</div>
	);
}
