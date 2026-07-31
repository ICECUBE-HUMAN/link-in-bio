import {
	getGridWidth,
	gridContainerPadding,
	gridMargin,
	gridRowHeight,
} from "@sinabro/grid-layout";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import GridLayout, { type EventCallback } from "react-grid-layout";
import { fastVerticalCompactor } from "react-grid-layout/extras";
import {
	GRID_ITEM_DRAG_CANCEL_SELECTOR,
	GridItemShell,
} from "@/components/grid/grid-item-shell";
import { ItemRenderer } from "@/components/grid/item-renderer";
import { useGridDragMotion } from "@/hooks/use-grid-drag-motion";
import {
	createGridDemoItems,
	createLinkProviderDemoItems,
} from "@/lib/grid/grid-demo-data";
import {
	resolveDraggedLayout,
	toLayoutMap as toGridLayoutMap,
} from "@/lib/grid/grid-drag";
import {
	type GridItemCommandHandler,
	getItemCapabilities,
} from "@/lib/grid/item-registry";
import { getColumns, inferPresetFromLayout } from "@/lib/grid/layout-engine";
import type { Breakpoint, GridItem, LayoutMap } from "@/lib/grid/types";
import type { PageMode } from "@/lib/page/page-mode";

type GridSectionProps = {
	items: readonly GridItem[];
	breakpoint: Breakpoint;
	mode: PageMode;
	enrichingItemIds?: ReadonlySet<string>;
	autoFocusItemId?: string | null;
	onAutoFocus?: (itemId: string) => void;
	onCommand: GridItemCommandHandler;
};

const GRID_ITEM_EXIT_DURATION = 180;

const desktopMediaQuery = "(min-width: 90rem)";

function subscribeToDesktopLayout(onChange: () => void) {
	const mediaQuery = window.matchMedia(desktopMediaQuery);
	mediaQuery.addEventListener("change", onChange);
	return () => mediaQuery.removeEventListener("change", onChange);
}

function getDesktopLayoutSnapshot() {
	return window.matchMedia(desktopMediaQuery).matches;
}

function getDesktopLayoutServerSnapshot() {
	return false;
}

export function GridSection({
	items,
	breakpoint,
	mode,
	enrichingItemIds = new Set(),
	autoFocusItemId = null,
	onAutoFocus,
	onCommand,
}: GridSectionProps) {
	const dragStartLayoutRef = useRef<LayoutMap | null>(null);
	const knownItemIdsRef = useRef<Set<string>>(new Set());
	const hasInitializedItemsRef = useRef(false);
	const initialAnimationScheduledRef = useRef(false);
	const enteringItemFramesRef = useRef(new Map<string, number>());
	const exitingItemTimersRef = useRef(new Map<string, number>());
	const previousItemsByIdRef = useRef(
		new Map(items.map((item) => [item.id, item])),
	);
	const [demoItemCount, setDemoItemCount] = useState(0);
	const [showLinkProviderDemo, setShowLinkProviderDemo] = useState(false);
	const [exitingItems, setExitingItems] = useState<
		ReadonlyMap<string, GridItem>
	>(new Map());
	const [initialEnteringItemIds, setInitialEnteringItemIds] = useState<
		ReadonlySet<string>
	>(() => new Set(items.map((item) => item.id)));
	const [enteringItemIds, setEnteringItemIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
	const [layoutRevision, setLayoutRevision] = useState(0);
	const isDesktopLayout = useSyncExternalStore(
		subscribeToDesktopLayout,
		getDesktopLayoutSnapshot,
		getDesktopLayoutServerSnapshot,
	);
	const dragMotion = useGridDragMotion();
	const renderedItems = useMemo(() => {
		const gridDemoItems =
			demoItemCount > 0 ? createGridDemoItems(items, demoItemCount) : [];
		const itemsWithGridDemo = [...items, ...gridDemoItems];
		const providerDemoItems = showLinkProviderDemo
			? createLinkProviderDemoItems(itemsWithGridDemo)
			: [];
		return [...itemsWithGridDemo, ...providerDemoItems];
	}, [demoItemCount, items, showLinkProviderDemo]);
	const displayItems = useMemo(() => {
		const renderedItemIds = new Set(renderedItems.map((item) => item.id));
		return [
			...renderedItems,
			...[...exitingItems.entries()]
				.filter(([itemId]) => !renderedItemIds.has(itemId))
				.map(([, item]) => item),
		];
	}, [exitingItems, renderedItems]);
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
		setShowLinkProviderDemo(
			new URLSearchParams(window.location.search).get("link-demo") ===
				"providers",
		);
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

	const startItemExit = useCallback((item: GridItem) => {
		if (exitingItemTimersRef.current.has(item.id)) return;
		setExitingItems((current) => {
			if (current.has(item.id)) return current;
			return new Map(current).set(item.id, item);
		});
		const timer = window.setTimeout(() => {
			setExitingItems((current) => {
				const next = new Map(current);
				next.delete(item.id);
				return next;
			});
			exitingItemTimersRef.current.delete(item.id);
		}, GRID_ITEM_EXIT_DURATION);
		exitingItemTimersRef.current.set(item.id, timer);
	}, []);

	useEffect(() => {
		const currentItemsById = new Map(items.map((item) => [item.id, item]));
		for (const [itemId, previousItem] of previousItemsByIdRef.current) {
			if (!currentItemsById.has(itemId)) startItemExit(previousItem);
		}
		for (const itemId of currentItemsById.keys()) {
			const timer = exitingItemTimersRef.current.get(itemId);
			if (timer === undefined) continue;
			window.clearTimeout(timer);
			exitingItemTimersRef.current.delete(itemId);
			setExitingItems((current) => {
				const next = new Map(current);
				next.delete(itemId);
				return next;
			});
		}
		previousItemsByIdRef.current = currentItemsById;
	}, [items, startItemExit]);

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
			initialAnimationScheduledRef.current = false;
			for (const frame of enteringItemFramesRef.current.values()) {
				window.cancelAnimationFrame(frame);
			}
			for (const timer of exitingItemTimersRef.current.values()) {
				window.clearTimeout(timer);
			}
		};
	}, []);

	const effectiveBreakpoint = isDesktopLayout ? breakpoint : "compact";
	const isAnyItemDragging = draggingItemId !== null;
	const cols = getColumns(effectiveBreakpoint);
	const gridWidth = getGridWidth(cols);
	const handleGridCommand: GridItemCommandHandler = (command) => {
		if (command.type === "delete-item") {
			const item = displayItems.find(
				(candidate) => candidate.id === command.itemId,
			);
			if (item) startItemExit(item);
		}
		if (command.type === "apply-preset") {
			return onCommand({ ...command, breakpoint: effectiveBreakpoint });
		}
		return onCommand(command);
	};

	const layout = useMemo(
		() =>
			displayItems.map((item) => ({
				i: item.id,
				...item.layouts[effectiveBreakpoint],
				isResizable: false,
				resizeHandles: [],
			})),
		[displayItems, effectiveBreakpoint],
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
			className="grid-section-shell flex min-w-full max-w-full shrink-0 justify-center overflow-visible pb-80"
			style={{ width: gridWidth }}
		>
			<GridLayout
				key={`${effectiveBreakpoint}-${layoutRevision}`}
				className={`sinabro-grid-layout max-w-full overflow-visible${mode === "edit" ? " is-edit-mode" : ""}`}
				style={{ width: gridWidth }}
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
				{displayItems.map((item) => {
					const itemLayout = item.layouts[effectiveBreakpoint];
					const currentPreset = inferPresetFromLayout(
						item.type,
						itemLayout,
						effectiveBreakpoint,
					);
					const initialEnteringIndex =
						initialEnteringIndexById.get(item.id) ?? -1;
					const isInitialEntering = initialEnteringItemIds.has(item.id);
					const isEntering = isInitialEntering || enteringItemIds.has(item.id);
					const isExiting = exitingItems.has(item.id);
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
								isExiting={isExiting}
								enteringIndex={Math.max(initialEnteringIndex, 0)}
								isAnyItemDragging={isAnyItemDragging}
								capabilities={capabilities}
								onCommand={handleGridCommand}
							>
								{capabilities.canRender && currentPreset !== null ? (
									<ItemRenderer
										item={item}
										breakpoint={effectiveBreakpoint}
										preset={currentPreset}
										mode={mode}
										isEnriching={enrichingItemIds.has(item.id)}
										autoFocus={item.id === autoFocusItemId}
										onAutoFocus={
											onAutoFocus ? () => onAutoFocus(item.id) : undefined
										}
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
