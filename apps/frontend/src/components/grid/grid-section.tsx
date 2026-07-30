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

type PointerPoint = {
	x: number;
	y: number;
};

type DragVelocityState = PointerPoint & {
	time: number;
};

const MAX_DRAG_VELOCITY = 1400;
const VELOCITY_TO_ROTATION = 0.018;

function getPointerPoint(event: Event): PointerPoint | null {
	if ("clientX" in event && "clientY" in event) {
		const { clientX, clientY } = event as MouseEvent;
		if (typeof clientX === "number" && typeof clientY === "number") {
			return { x: clientX, y: clientY };
		}
	}

	const touch = (event as TouchEvent).touches?.[0];
	return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

function setDragVelocity(element: HTMLElement | null, x: number, y: number) {
	const card = element?.querySelector<HTMLElement>("[data-grid-item-card]");
	if (!card) return;

	card.style.setProperty(
		"--grid-drag-rotate-x",
		`${y * -VELOCITY_TO_ROTATION}deg`,
	);
	card.style.setProperty(
		"--grid-drag-rotate-z",
		`${x * VELOCITY_TO_ROTATION}deg`,
	);
}

function resetDragVelocity(element: HTMLElement | null) {
	setDragVelocity(element, 0, 0);
}

export function GridSection({
	items,
	breakpoint,
	mode,
	onCommand,
}: GridSectionProps) {
	const dragStartLayoutRef = useRef<LayoutMap | null>(null);
	const knownItemIdsRef = useRef(new Set(items.map((item) => item.id)));
	const enteringItemFramesRef = useRef(new Map<string, number>());
	const [enteringItemIds, setEnteringItemIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
	const [layoutRevision, setLayoutRevision] = useState(0);
	const [isDesktopLayout, setIsDesktopLayout] = useState(false);
	const dragVelocityStateRef = useRef<DragVelocityState | null>(null);
	const draggingElementRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		const currentItemIds = new Set(items.map((item) => item.id));
		const newItemIds = items
			.filter((item) => !knownItemIdsRef.current.has(item.id))
			.map((item) => item.id);

		knownItemIdsRef.current = currentItemIds;
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
	}, [items]);

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

	const handleDragStart: EventCallback = (
		currentLayout,
		oldItem,
		_newItem,
		_placeholder,
		event,
		element,
	) => {
		dragStartLayoutRef.current = toGridLayoutMap(currentLayout);
		setDraggingItemId(oldItem?.i ?? null);
		draggingElementRef.current = element;
		const point = getPointerPoint(event);
		dragVelocityStateRef.current = point
			? { ...point, time: performance.now() }
			: null;
		resetDragVelocity(element);
	};

	const handleDrag: EventCallback = (
		_currentLayout,
		_oldItem,
		_newItem,
		_placeholder,
		event,
		element,
	) => {
		const point = getPointerPoint(event);
		if (!point) return;

		const now = performance.now();
		const previous = dragVelocityStateRef.current;
		if (!previous) {
			dragVelocityStateRef.current = { ...point, time: now };
			return;
		}

		const elapsed = Math.max(now - previous.time, 8);
		const velocityX = Math.max(
			-MAX_DRAG_VELOCITY,
			Math.min(MAX_DRAG_VELOCITY, ((point.x - previous.x) / elapsed) * 1000),
		);
		const velocityY = Math.max(
			-MAX_DRAG_VELOCITY,
			Math.min(MAX_DRAG_VELOCITY, ((point.y - previous.y) / elapsed) * 1000),
		);

		dragVelocityStateRef.current = { ...point, time: now };
		setDragVelocity(
			element ?? draggingElementRef.current,
			velocityX,
			velocityY,
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
		resetDragVelocity(element ?? draggingElementRef.current);
		draggingElementRef.current = null;
		dragVelocityStateRef.current = null;
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
			className="grid-section-shell flex justify-center min-w-full min-h-dvh max-w-full shrink-0 overflow-visible pb-80"
			style={{ width: gridWidth }}
		>
			<GridLayout
				key={layoutRevision}
				className={`sinabro-grid-layout min-h-dvh max-w-full overflow-visible${mode === "edit" ? " is-edit-mode" : ""}`}
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
								isEntering={enteringItemIds.has(item.id)}
								isDragging={draggingItemId === item.id}
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
