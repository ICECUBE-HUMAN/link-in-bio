import GridLayout, {
	type EventCallback,
	noCompactor,
} from "react-grid-layout";
import useMeasure from "react-use-measure";
import { useMemo, useRef } from "react";
import {
	GRID_ITEM_DRAG_CANCEL_SELECTOR,
	GridItemShell,
} from "@/components/grid/grid-item-shell";
import { ItemRenderer } from "@/components/grid/item-renderer";
import {
	getItemCapabilities,
	type GridItemCommandHandler,
} from "@/lib/grid/item-registry";
import { getColumns } from "@/lib/grid/layout-engine";
import type { Breakpoint, GridItem } from "@/lib/grid/types";
import type { PageMode } from "@/lib/page/page-mode";

const GRID_MARGIN: [number, number] = [16, 16];
const GRID_CONTAINER_PADDING: [number, number] = [0, 0];
const MIN_WIDE_CELL_WIDTH = 140;

type GridSectionProps = {
	items: readonly GridItem[];
	breakpoint: Breakpoint;
	mode: PageMode;
	onCommand: GridItemCommandHandler;
};

function getGridMetrics(width: number, cols: number) {
	const horizontalGap = GRID_MARGIN[0] * Math.max(0, cols - 1);
	const horizontalPadding = GRID_CONTAINER_PADDING[0] * 2;
	const usableWidth = Math.max(0, width - horizontalGap - horizontalPadding);
	const horizontalCellWidth = cols > 0 ? usableWidth / cols : 0;

	return {
		usableWidth,
		horizontalCellWidth,
		rowHeight: horizontalCellWidth / 2,
	};
}

function getPublicBreakpoint(width: number): Breakpoint {
	const wideMetrics = getGridMetrics(width, getColumns("wide"));
	return wideMetrics.horizontalCellWidth >= MIN_WIDE_CELL_WIDTH
		? "wide"
		: "compact";
}

export function GridSection({
	items,
	breakpoint,
	mode,
	onCommand,
}: GridSectionProps) {
	const [measureRef, bounds] = useMeasure();
	const dragAxisRef = useRef<Record<string, "x" | "y" | undefined>>({});
	const measuredBreakpoint =
		mode === "edit" || bounds.width <= 0
			? breakpoint
			: getPublicBreakpoint(bounds.width);
	const effectiveBreakpoint = mode === "edit" ? breakpoint : measuredBreakpoint;
	const cols = getColumns(effectiveBreakpoint);
	const metrics = getGridMetrics(bounds.width, cols);

	const layout = useMemo(
		() =>
			items.map((item) => ({
				i: item.id,
				...item.layouts[effectiveBreakpoint],
				isResizable: false,
				resizeHandles: [],
			})),
		[effectiveBreakpoint, items],
	);

	const handleDragStart: EventCallback = (_layout, oldItem) => {
		if (!oldItem) return;
		dragAxisRef.current[oldItem.i] = undefined;
	};

	const handleDrag: EventCallback = (_layout, oldItem, newItem) => {
		if (!oldItem || !newItem) return;
		if (dragAxisRef.current[oldItem.i]) return;
		if (newItem.x !== oldItem.x) {
			dragAxisRef.current[oldItem.i] = "x";
			return;
		}
		if (newItem.y !== oldItem.y) {
			dragAxisRef.current[oldItem.i] = "y";
		}
	};

	const handleDragStop: EventCallback = (_layout, oldItem, newItem) => {
		if (!oldItem || !newItem) return;
		onCommand({
			type: "move-item",
			itemId: newItem.i,
			layout: {
				x: newItem.x,
				y: newItem.y,
				w: newItem.w,
				h: newItem.h,
			},
			dragDelta: {
				x: newItem.x - oldItem.x,
				y: newItem.y - oldItem.y,
				firstCrossedAxis: dragAxisRef.current[newItem.i],
			},
		});
		delete dragAxisRef.current[newItem.i];
	};

	return (
		<div ref={measureRef} className="grid-section-shell w-full">
			<GridLayout
				className="sinabro-grid-layout"
				layout={layout}
				width={Math.max(bounds.width, 0)}
				gridConfig={{
					cols,
					rowHeight: Math.max(metrics.rowHeight, 1),
					margin: GRID_MARGIN,
					containerPadding: GRID_CONTAINER_PADDING,
				}}
				dragConfig={{
					enabled: mode === "edit",
					bounded: mode === "edit",
					cancel: GRID_ITEM_DRAG_CANCEL_SELECTOR,
				}}
				resizeConfig={{
					enabled: false,
				}}
				autoSize
				compactor={noCompactor}
				onDragStart={handleDragStart}
				onDrag={handleDrag}
				onDragStop={handleDragStop}
			>
				{items.map((item) => {
					const itemLayout = item.layouts[effectiveBreakpoint];
					const capabilities = getItemCapabilities(item, {
						breakpoint: effectiveBreakpoint,
						mode,
					});

					return (
						<div key={item.id}>
							<GridItemShell
								item={item}
								layout={itemLayout}
								capabilities={capabilities}
								onCommand={onCommand}
							>
								{capabilities.canRender && item.preset !== null ? (
									<ItemRenderer
										item={item}
										breakpoint={effectiveBreakpoint}
						preset={item.preset}
						mode={mode}
						onCommand={onCommand}
					/>
								) : null}
							</GridItemShell>
						</div>
					);
				})}
			</GridLayout>
		</div>
	);
}
