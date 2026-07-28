import type { ItemRendererProps } from "@/lib/grid/item-registry";
import { toGoogleMapsUrl } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";

function formatCoordinate(value: number) {
	return value.toFixed(5);
}

export function MapItemRenderer({
	item,
	mode,
	onCommand,
}: ItemRendererProps<GridItemByType<"map">>) {
	const href = toGoogleMapsUrl(item.data.latitude, item.data.longitude);

	return (
		<div className="relative size-full overflow-hidden bg-[radial-gradient(circle_at_top_left,var(--color-primary)/16,transparent_55%),linear-gradient(135deg,var(--color-muted),color-mix(in_oklch,var(--color-muted),white_28%))] p-4">
			<div className="relative flex size-full flex-col justify-between gap-4">
				<div className="flex items-start justify-between gap-3">
					<div className="rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
						Coordinates
					</div>
					<a
						href={href}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/85"
					>
						Google Maps
					</a>
				</div>
				<div className="space-y-2">
					<p className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
						{formatCoordinate(item.data.latitude)},{" "}
						{formatCoordinate(item.data.longitude)}
					</p>
					{item.data.caption?.trim() ? (
						<div className="inline-flex max-w-full rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
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
							className="truncate"
						>
							{item.data.caption}
						</p>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
