import { getLinkProviderPresentation } from "@sinabro/api";
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { ItemDeleteButton } from "@/components/grid/item-controls";
import type {
	GridItemCommandHandler,
	ItemCapabilities,
} from "@/lib/grid/item-registry";
import { getItemViewRegistration } from "@/lib/grid/item-registry";
import type { GridItem, ItemLayout } from "@/lib/grid/types";
import { getLinkCardThemeStyle } from "@/lib/link/provider-presentation";
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
	isInitialEntering?: boolean;
	isExiting?: boolean;
	enteringIndex?: number;
	isAnyItemDragging?: boolean;
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

function getCardThemeStyle(item: GridItem): CSSProperties | undefined {
	if (item.type !== "link") return undefined;
	const provider = getLinkProviderPresentation(item.data.url).id;
	return getLinkCardThemeStyle(provider);
}

export function GridItemShell({
	item,
	layout,
	isEntering = false,
	isInitialEntering = false,
	isExiting = false,
	enteringIndex = 0,
	isAnyItemDragging = false,
	capabilities,
	onCommand,
	children,
}: GridItemShellProps) {
	const hasContent = children !== null && children !== undefined;
	const hasControls =
		capabilities.controls.some(
			(control) => control.command !== "delete-item",
		) &&
		onCommand &&
		!isAnyItemDragging &&
		!isExiting;
	const hasDeleteControl =
		capabilities.controls.some(
			(control) => control.command === "delete-item",
		) &&
		onCommand &&
		!isAnyItemDragging &&
		!isExiting;
	const ControlsView = getItemViewRegistration(item).controls;
	const shellRef = useRef<HTMLDivElement>(null);
	const hideControlsTimer = useRef<number | null>(null);
	const pointerInsideRef = useRef(false);
	const [controlsOpen, setControlsOpen] = useState(false);
	const style = {
		"--grid-item-layout-w": String(layout.w),
		"--grid-item-layout-h": String(layout.h),
		"--grid-item-enter-delay": isEntering
			? `${Math.min(enteringIndex * 40, 280)}ms`
			: "0ms",
	} as CSSProperties;
	const cardThemeStyle = getCardThemeStyle(item);

	useEffect(() => {
		return () => {
			if (hideControlsTimer.current !== null) {
				window.clearTimeout(hideControlsTimer.current);
			}
		};
	}, []);

	function showControls() {
		if (hideControlsTimer.current !== null) {
			window.clearTimeout(hideControlsTimer.current);
			hideControlsTimer.current = null;
		}
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
		if (isAnyItemDragging) {
			if (hideControlsTimer.current !== null) {
				window.clearTimeout(hideControlsTimer.current);
				hideControlsTimer.current = null;
			}
			setControlsOpen(false);
			return;
		}
		if (!pointerInsideRef.current) return;

		setControlsOpen(true);
	}, [isAnyItemDragging]);

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
				isInitialEntering && "grid-item-initial-enter",
				isExiting && "is-exiting",
				"transition-[z-index] hover:z-50 focus-within:z-50",
			)}
			onPointerEnter={() => {
				if (isAnyItemDragging) return;
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
				className={cn(
					"grid-item-card relative size-full overflow-hidden bg-background rounded-2xl shadow-sm",
					cardThemeStyle && "link-card-themed",
					item.type === "media" || item.type === "map"
						? "ring-0! border-0!"
						: "ring-1 ring-black/5",
				)}
				style={cardThemeStyle}
			>
				<div className="relative z-10 size-full min-h-0 rounded-[inherit]">
					{hasContent ? children : <RuntimeFallback item={item} />}
				</div>
			</div>
			{hasDeleteControl ? (
				<ItemDeleteButton itemId={item.id} onCommand={onCommand} />
			) : null}
			{hasControls ? (
				<div
					data-grid-item-drag-cancel="true"
					className={cn(
						"absolute top-full left-1/2 z-99999 mt-3 -translate-x-1/2",
						"transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
						controlsOpen
							? "pointer-events-auto opacity-100"
							: "pointer-events-none opacity-0",
					)}
					onPointerEnter={showControls}
					onPointerLeave={hideControls}
				>
					<div className="w-max">
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
