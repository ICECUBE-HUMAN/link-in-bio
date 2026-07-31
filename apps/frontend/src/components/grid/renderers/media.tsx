import { CircleArrowRightUp } from "reicon-react";
import { Input } from "@/components/ui/input";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import { DEFAULT_IMAGE_DATA_URL } from "@/lib/shared/default-image";
import { cn } from "@/lib/utils";

function MediaAction({ href }: { href: string | undefined }) {
	if (!href) {
		return null;
	}

	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="cursor-pointer! inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/60 text-xs font-medium text-white transition-colors hover:bg-white"
		>
			<CircleArrowRightUp size={28} weight="Filled" className="text-black!" />
		</a>
	);
}

export function MediaItemRenderer({
	item,
	mode,
	onCommand,
}: ItemRendererProps<GridItemByType<"media">>) {
	const isVideo = item.data.mimeType.startsWith("video/");

	return (
		<div className="relative size-full overflow-hidden rounded-[inherit] bg-muted surface-line">
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
					"pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 text-white",
					// preset === "squareSmall" ? "min-h-24" : "min-h-28",
				)}
			>
				{mode === "edit" ? (
					<Input
						value={item.data.caption ?? ""}
						placeholder="Caption"
						onChange={(event) =>
							onCommand?.({
								type: "update-data",
								itemId: item.id,
								data: { ...item.data, caption: event.target.value },
							})
						}
						className="pointer-events-auto field-sizing-content h-7.5 w-fit max-w-full min-w-24 truncate rounded-sm border-0 bg-white/100 px-2 py-0 text-xs font-medium text-foreground shadow-none  placeholder:text-gray-bright/60"
					/>
				) : (
					<p className="min-w-0 max-w-full truncate text-xs font-medium">
						{item.data.caption?.trim()}
					</p>
				)}
			</div>
			<div className="absolute top-4 right-4">
				<MediaAction href={item.data.mediaUrl} />
			</div>
		</div>
	);
}
