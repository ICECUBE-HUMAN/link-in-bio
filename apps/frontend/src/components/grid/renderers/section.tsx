import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";

export function SectionItemRenderer({
	item,
	mode,
	onCommand,
}: ItemRendererProps<GridItemByType<"section">>) {
	return (
		<div className="flex size-full items-center overflow-hidden px-5">
			<p
				contentEditable={mode === "edit"}
				suppressContentEditableWarning
				onBlur={(event) => {
					if (!onCommand) return;
					onCommand({
						type: "update-data",
						itemId: item.id,
						data: { title: event.currentTarget.textContent ?? "" },
					});
				}}
				className="line-clamp-1 w-full text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase"
			>
				{item.data.title}
			</p>
		</div>
	);
}
