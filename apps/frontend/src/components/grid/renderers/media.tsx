import { useState } from "react";
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
	const mediaUrl = item.data.mediaUrl;
	const [loadedMediaUrl, setLoadedMediaUrl] = useState<string | null>(null);
	const isMediaLoaded = mediaUrl !== undefined && loadedMediaUrl === mediaUrl;

	return (
		<div className="relative size-full overflow-hidden rounded-[inherit] bg-muted/30 surface-line">
			<img
				src={DEFAULT_IMAGE_DATA_URL}
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 size-full object-cover"
			/>
			{mediaUrl && isVideo ? (
				<video
					src={mediaUrl}
					autoPlay
					muted
					loop
					playsInline
					onLoadedData={() => setLoadedMediaUrl(mediaUrl)}
					className={cn(
						"pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-200 ease-out",
						isMediaLoaded ? "opacity-100" : "opacity-0",
					)}
				/>
			) : mediaUrl ? (
				<img
					src={mediaUrl}
					alt={item.data.caption ?? "Media item"}
					onLoad={() => setLoadedMediaUrl(mediaUrl)}
					className={cn(
						"absolute inset-0 size-full object-cover transition-opacity duration-200 ease-out",
						isMediaLoaded ? "opacity-100" : "opacity-0",
					)}
				/>
			) : null}
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
