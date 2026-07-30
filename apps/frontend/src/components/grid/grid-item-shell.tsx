import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
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
	isEntering?: boolean;
	isDragging?: boolean;
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
	isEntering = false,
	isDragging = false,
	capabilities,
	onCommand,
	children,
}: GridItemShellProps) {
	const hasContent = children !== null && children !== undefined;
	const hasControls =
		capabilities.controls.length > 0 && onCommand && !isDragging;
	const ControlsView = getItemViewRegistration(item).controls;
	const shellRef = useRef<HTMLDivElement>(null);
	const hideControlsTimer = useRef<number | null>(null);
	const pointerInsideRef = useRef(false);
	const [controlsPosition, setControlsPosition] = useState<{
		left: number;
		top: number;
	} | null>(null);
	const [controlsOpen, setControlsOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const style = {
		"--grid-item-layout-w": String(layout.w),
		"--grid-item-layout-h": String(layout.h),
	} as CSSProperties;

	useEffect(() => {
		setIsMounted(true);
		return () => {
			if (hideControlsTimer.current !== null) {
				window.clearTimeout(hideControlsTimer.current);
			}
		};
	}, []);

	const updateControlsPosition = useCallback(() => {
		const rect = shellRef.current?.getBoundingClientRect();
		if (!rect) return;
		setControlsPosition({
			left: rect.left + rect.width / 2,
			top: rect.bottom + 12,
		});
	}, []);

	function showControls() {
		if (hideControlsTimer.current !== null) {
			window.clearTimeout(hideControlsTimer.current);
			hideControlsTimer.current = null;
		}
		updateControlsPosition();
		setControlsOpen(true);
	}

	function hideControls() {
		if (hideControlsTimer.current !== null) {
			window.clearTimeout(hideControlsTimer.current);
		}
		hideControlsTimer.current = window.setTimeout(() => {
			setControlsOpen(false);
			hideControlsTimer.current = null;
		}, 120);
	}

	useEffect(() => {
		if (!controlsOpen) return;
		const handleViewportChange = () => updateControlsPosition();
		window.addEventListener("resize", handleViewportChange);
		window.addEventListener("scroll", handleViewportChange, true);
		return () => {
			window.removeEventListener("resize", handleViewportChange);
			window.removeEventListener("scroll", handleViewportChange, true);
		};
	}, [controlsOpen, updateControlsPosition]);

	useEffect(() => {
		if (isDragging) {
			if (hideControlsTimer.current !== null) {
				window.clearTimeout(hideControlsTimer.current);
				hideControlsTimer.current = null;
			}
			setControlsOpen(false);
			setControlsPosition(null);
			return;
		}
		if (!pointerInsideRef.current) return;

		const frame = window.requestAnimationFrame(() => {
			if (!pointerInsideRef.current) return;
			updateControlsPosition();
			setControlsOpen(true);
		});
		return () => window.cancelAnimationFrame(frame);
	}, [isDragging, updateControlsPosition]);

	return (
		<div
			ref={shellRef}
			data-grid-item-shell="true"
			data-grid-item-id={item.id}
			data-grid-item-type={item.type}
			data-grid-item-preset={item.preset ?? "unsupported"}
			data-grid-item-drag-cancel-selector={GRID_ITEM_DRAG_CANCEL_SELECTOR}
			className={cn(
				"group/grid-item relative size-full overflow-visible rounded-2xl",
				"grid-item-pop-in",
				isEntering && "is-entering",
				"transition-[z-index] hover:z-50 focus-within:z-50",
			)}
			onPointerEnter={() => {
				pointerInsideRef.current = true;
				showControls();
			}}
			onPointerLeave={() => {
				pointerInsideRef.current = false;
				hideControls();
			}}
			style={style}
		>
			<div
				data-grid-item-card="true"
				className="grid-item-card relative size-full overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-black/5"
			>
				<div className="relative z-10 size-full min-h-0">
					{hasContent ? children : <RuntimeFallback item={item} />}
				</div>
			</div>
			{hasControls && isMounted && controlsPosition
				? createPortal(
						<div
							data-grid-item-drag-cancel="true"
							className={cn(
								"pointer-events-none fixed z-[99999] -translate-x-1/2",
								"transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
								controlsOpen ? "opacity-100" : "opacity-0",
							)}
							style={{
								left: controlsPosition.left,
								top: controlsPosition.top,
							}}
							onPointerEnter={showControls}
							onPointerLeave={hideControls}
						>
							<div className="pointer-events-auto w-max">
								<ControlsView
									item={item}
									capabilities={capabilities}
									onCommand={onCommand}
								/>
							</div>
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
