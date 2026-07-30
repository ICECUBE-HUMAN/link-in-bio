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
import { useGridDragMotion } from "@/hooks/use-grid-drag-motion";
import { createGridDemoItems } from "@/lib/grid/grid-demo-data";
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
	const knownItemIdsRef = useRef<Set<string>>(new Set());
	const hasInitializedItemsRef = useRef(false);
	const initialAnimationScheduledRef = useRef(false);
	const enteringItemFramesRef = useRef(new Map<string, number>());
	const [demoItemCount, setDemoItemCount] = useState(0);
	const [initialEnteringItemIds, setInitialEnteringItemIds] = useState<
		ReadonlySet<string>
	>(() => new Set(items.map((item) => item.id)));
	const [enteringItemIds, setEnteringItemIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
	const [layoutRevision, setLayoutRevision] = useState(0);
	const [isDesktopLayout, setIsDesktopLayout] = useState(false);
	const dragMotion = useGridDragMotion();
	const renderedItems = useMemo(
		() =>
			demoItemCount > 0
				? [...items, ...createGridDemoItems(items, demoItemCount)]
				: items,
		[demoItemCount, items],
	);
	const initialEnteringIndexById = useMemo(
		() => new Map([...initialEnteringItemIds].map((id, index) => [id, index])),
		[initialEnteringItemIds],
	);

	useEffect(() => {
		if (!import.meta.env.DEV) return;
		const value = new URLSearchParams(window.location.search).get("grid-demo");
		const count = Number.parseInt(value ?? "", 10);
		if (Number.isFinite(count))
			setDemoItemCount(Math.min(Math.max(count, 0), 48));
	}, []);

	useEffect(() => {
		const currentItemIds = new Set(renderedItems.map((item) => item.id));
		const isInitialRender = !hasInitializedItemsRef.current;
		const newItemIds = isInitialRender
			? []
			: renderedItems
					.filter((item) => !knownItemIdsRef.current.has(item.id))
					.map((item) => item.id);

		knownItemIdsRef.current = currentItemIds;
		hasInitializedItemsRef.current = true;
		if (newItemIds.length === 0) return;

		setEnteringItemIds((current) => new Set([...current, ...newItemIds]));
		for (const itemId of newItemIds) {
			const firstFrame = window.requestAnimationFrame(() => {
				const secondFrame = window.requestAnimationFrame(() => {
					setEnteringItemIds((current) => {
						const next = new Set(current);
						next.delete(itemId);
						return next;
					});
					enteringItemFramesRef.current.delete(itemId);
				});
				enteringItemFramesRef.current.set(itemId, secondFrame);
			});
			enteringItemFramesRef.current.set(itemId, firstFrame);
		}
	}, [renderedItems]);

	useEffect(() => {
		if (
			initialAnimationScheduledRef.current ||
			initialEnteringItemIds.size === 0
		)
			return;
		initialAnimationScheduledRef.current = true;

		for (const itemId of initialEnteringItemIds) {
			const firstFrame = window.requestAnimationFrame(() => {
				const secondFrame = window.requestAnimationFrame(() => {
					setInitialEnteringItemIds((current) => {
						const next = new Set(current);
						next.delete(itemId);
						return next;
					});
					enteringItemFramesRef.current.delete(itemId);
				});
				enteringItemFramesRef.current.set(itemId, secondFrame);
			});
			enteringItemFramesRef.current.set(itemId, firstFrame);
		}
	}, [initialEnteringItemIds]);

	useEffect(() => {
		return () => {
			for (const frame of enteringItemFramesRef.current.values()) {
				window.cancelAnimationFrame(frame);
			}
		};
	}, []);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(min-width: 90rem)");
		const handleChange = () => setIsDesktopLayout(mediaQuery.matches);
		handleChange();
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	const effectiveBreakpoint = isDesktopLayout ? breakpoint : "compact";
	const isAnyItemDragging = draggingItemId !== null;
	const hasItems = renderedItems.length > 0;
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
			renderedItems.map((item) => ({
				i: item.id,
				...item.layouts[effectiveBreakpoint],
				isResizable: false,
				resizeHandles: [],
			})),
		[effectiveBreakpoint, renderedItems],
	);

	const handleDragStart: EventCallback = (
		currentLayout,
		oldItem,
		_newItem,
		_placeholder,
		event,
		element,
	) => {
		dragMotion.onDragStart(
			currentLayout,
			oldItem,
			_newItem,
			_placeholder,
			event,
			element,
		);
		dragStartLayoutRef.current = toGridLayoutMap(currentLayout);
		setDraggingItemId(oldItem?.i ?? null);
	};

	const handleDrag: EventCallback = (
		_currentLayout,
		_oldItem,
		_newItem,
		_placeholder,
		event,
		element,
	) => {
		dragMotion.onDrag(
			_currentLayout,
			_oldItem,
			_newItem,
			_placeholder,
			event,
			element,
		);
	};

	const handleDragStop: EventCallback = (
		nextLayout,
		_oldItem,
		_newItem,
		_placeholder,
		_event,
		element,
	) => {
		dragMotion.onDragStop(
			nextLayout,
			_oldItem,
			_newItem,
			_placeholder,
			_event,
			element,
		);
		const dragStartLayout =
			dragStartLayoutRef.current ?? toGridLayoutMap(layout);
		const resolved = resolveDraggedLayout({
			nextLayout,
			dragStartLayout,
			cols,
		});
		if (resolved.outsideGrid) {
			setLayoutRevision((revision) => revision + 1);
		}
		dragStartLayoutRef.current = null;
		setDraggingItemId(null);
		onCommand({
			type: "replace-layout",
			breakpoint: effectiveBreakpoint,
			layout: resolved.layout,
		});
	};

	return (
		<div
			className="grid-section-shell flex justify-center min-w-full max-w-full shrink-0 overflow-visible pb-80"
			style={{ width: gridWidth, minHeight: hasItems ? "100dvh" : 0 }}
		>
			<GridLayout
				key={layoutRevision}
				className={`sinabro-grid-layout min-h-dvh max-w-full overflow-visible${mode === "edit" ? " is-edit-mode" : ""}`}
				style={{ minHeight: hasItems ? "100dvh" : 0, width: gridWidth }}
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
				onDrag={handleDrag}
				onDragStop={handleDragStop}
			>
				{renderedItems.map((item) => {
					const itemLayout = item.layouts[effectiveBreakpoint];
					const initialEnteringIndex =
						initialEnteringIndexById.get(item.id) ?? -1;
					const isInitialEntering = initialEnteringItemIds.has(item.id);
					const isEntering = isInitialEntering || enteringItemIds.has(item.id);
					const capabilities = getItemCapabilities(item, {
						breakpoint: effectiveBreakpoint,
						mode,
					});

					return (
						<div key={item.id}>
							<GridItemShell
								item={item}
								layout={itemLayout}
								isEntering={isEntering}
								isInitialEntering={isInitialEntering}
								enteringIndex={Math.max(initialEnteringIndex, 0)}
								isAnyItemDragging={isAnyItemDragging}
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
