import type { CSSProperties, ReactNode } from "react";
import type {
	GridItemCommandHandler,
	ItemCapabilities,
} from "@/lib/grid/item-registry";
import { getItemViewRegistration } from "@/lib/grid/item-registry";
import type { GridItem, ItemLayout } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

export const GRID_ITEM_DRAG_CANCEL_SELECTOR = [
	"a",
	"button",
	"input",
	"textarea",
	"select",
	"video",
	"[contenteditable='true']",
	"[data-grid-item-drag-cancel='true']",
].join(",");

type GridItemShellProps = {
	item: GridItem;
	layout: ItemLayout;
	capabilities: ItemCapabilities;
	onCommand?: GridItemCommandHandler;
	children?: ReactNode;
};

function RuntimeFallback({ item }: { item: GridItem }) {
	return (
		<div className="flex size-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
			Unsupported {item.type} item
		</div>
	);
}

export function GridItemShell({
	item,
	layout,
	capabilities,
	onCommand,
	children,
}: GridItemShellProps) {
	const hasContent = children !== null && children !== undefined;
	const hasControls = capabilities.controls.length > 0 && onCommand;
	const ControlsView = getItemViewRegistration(item).controls;
	const style = {
		"--grid-item-layout-w": String(layout.w),
		"--grid-item-layout-h": String(layout.h),
	} as CSSProperties;

	return (
		<div
			data-grid-item-shell="true"
			data-grid-item-id={item.id}
			data-grid-item-type={item.type}
			data-grid-item-preset={item.preset ?? "unsupported"}
			data-grid-item-drag-cancel-selector={GRID_ITEM_DRAG_CANCEL_SELECTOR}
			className={cn(
				"group/grid-item relative size-full overflow-visible rounded-[1.75rem]",
				"transition-[z-index] hover:z-20 focus-within:z-20",
			)}
			style={style}
		>
			<div className="relative size-full overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/95 shadow-sm ring-1 ring-black/5">
				<div className="relative z-10 size-full min-h-0">
					{hasContent ? children : <RuntimeFallback item={item} />}
				</div>
			</div>
			{hasControls ? (
				<div
					data-grid-item-drag-cancel="true"
					className={cn(
						"pointer-events-none absolute left-1/2 top-full z-30 mt-3 -translate-x-1/2",
						"opacity-0 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
						"group-hover/grid-item:opacity-100 group-focus-within/grid-item:opacity-100 group-active/grid-item:opacity-100",
					)}
				>
					<div className="pointer-events-auto">
						<ControlsView
							item={item}
							capabilities={capabilities}
							onCommand={onCommand}
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}
