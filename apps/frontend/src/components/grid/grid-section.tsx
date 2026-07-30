import {
	getGridWidth,
	gridContainerPadding,
	gridMargin,
	gridRowHeight,
} from "@sinabro/grid-layout";
import { useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { type EventCallback } from "react-grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";
import {
	GRID_ITEM_DRAG_CANCEL_SELECTOR,
	GridItemShell,
} from "@/components/grid/grid-item-shell";
import { ItemRenderer } from "@/components/grid/item-renderer";
import {
	resolveDraggedLayout,
	toLayoutMap as toGridLayoutMap,
} from "@/lib/grid/grid-drag";
import {
	type GridItemCommandHandler,
	getItemCapabilities,
} from "@/lib/grid/item-registry";
import { getColumns } from "@/lib/grid/layout-engine";
import type { Breakpoint, GridItem, LayoutMap } from "@/lib/grid/types";
import type { PageMode } from "@/lib/page/page-mode";

type GridSectionProps = {
	items: readonly GridItem[];
	breakpoint: Breakpoint;
	mode: PageMode;
	onCommand: GridItemCommandHandler;
};

export function GridSection({
	items,
	breakpoint,
	mode,
	onCommand,
}: GridSectionProps) {
	const dragStartLayoutRef = useRef<LayoutMap | null>(null);
	const [layoutRevision, setLayoutRevision] = useState(0);
	const [isDesktopLayout, setIsDesktopLayout] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(min-width: 90rem)");
		const handleChange = () => setIsDesktopLayout(mediaQuery.matches);
		handleChange();
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	const effectiveBreakpoint = isDesktopLayout ? breakpoint : "compact";
	const cols = getColumns(effectiveBreakpoint);
	const gridWidth = getGridWidth(cols);
	const handleGridCommand: GridItemCommandHandler = (command) => {
		if (command.type === "apply-preset") {
			onCommand({ ...command, breakpoint: effectiveBreakpoint });
			return;
		}
		onCommand(command);
	};

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

	const handleDragStart: EventCallback = (currentLayout, _oldItem) => {
		dragStartLayoutRef.current = toGridLayoutMap(currentLayout);
	};

	const handleDragStop: EventCallback = (nextLayout, oldItem, newItem) => {
		const dragStartLayout =
			dragStartLayoutRef.current ?? toGridLayoutMap(layout);
		const resolved = resolveDraggedLayout({
			nextLayout,
			dragStartLayout,
			oldItem,
			newItem,
			cols,
		});
		if (resolved.outsideGrid) {
			setLayoutRevision((revision) => revision + 1);
		}
		dragStartLayoutRef.current = null;
		onCommand({
			type: "replace-layout",
			breakpoint: effectiveBreakpoint,
			layout: resolved.layout,
		});
	};

	return (
		<div
			className="grid-section-shell mx-auto min-h-dvh shrink-0 overflow-visible"
			style={{ width: gridWidth }}
		>
			<GridLayout
				key={layoutRevision}
				className="sinabro-grid-layout min-h-dvh overflow-visible"
				style={{ minHeight: "100dvh", width: gridWidth }}
				layout={layout}
				width={gridWidth}
				gridConfig={{
					cols,
					rowHeight: gridRowHeight,
					margin: gridMargin,
					containerPadding: gridContainerPadding,
				}}
				dragConfig={{
					enabled: mode === "edit",
					bounded: false,
					cancel: GRID_ITEM_DRAG_CANCEL_SELECTOR,
				}}
				resizeConfig={{
					enabled: false,
				}}
				autoSize
				compactor={fastVerticalCompactor}
				onDragStart={handleDragStart}
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
								onCommand={handleGridCommand}
							>
								{capabilities.canRender && item.preset !== null ? (
									<ItemRenderer
										item={item}
										breakpoint={effectiveBreakpoint}
										preset={item.preset}
										mode={mode}
										onCommand={handleGridCommand}
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
