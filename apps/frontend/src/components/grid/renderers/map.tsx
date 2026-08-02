import {
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { ItemExternalAction } from "@/components/grid/item-external-action";
import { MapFallback } from "@/components/grid/map/map-fallback";
import { MapLocationSearch } from "@/components/grid/map/map-location-search";
import { MapViewportGate } from "@/components/grid/map/map-viewport-gate";
import {
	MapboxMapSurface,
	type MapboxMapSurfaceHandle,
} from "@/components/grid/map/mapbox-map-surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import { toGoogleMapsUrl } from "@/lib/grid/item-registry";
import type { GridItemByType } from "@/lib/grid/types";
import {
	getMapboxAccessToken,
	isSameMapCamera,
	type MapCamera,
	normalizeMapCamera,
} from "@/lib/map/map-config";
import type { MapSearchResult } from "@/lib/map/mapbox-geocoding";

export function MapItemRenderer({
	item,
	mode,
	isDragging = false,
	onCommand,
}: ItemRendererProps<GridItemByType<"map">>) {
	const [isLocationEditing, setIsLocationEditing] = useState(false);
	const [mapError, setMapError] = useState<unknown>(null);
	const [geolocationError, setGeolocationError] = useState<unknown>(null);
	const [mapSurfaceKey, setMapSurfaceKey] = useState(0);
	const [isGridDragPending, setIsGridDragPending] = useState(false);
	const isGridDragPendingRef = useRef(false);
	const needsMapRemountRef = useRef(false);
	const mapSurfaceRef = useRef<MapboxMapSurfaceHandle>(null);
	const accessToken = getMapboxAccessToken();
	const normalizedCamera = normalizeMapCamera(item.data);
	const interactive = mode === "edit" && isLocationEditing;
	const showMapFallback = !accessToken || mapError !== null;

	useEffect(() => {
		if (isDragging || isGridDragPending || !needsMapRemountRef.current) return;

		const frame = requestAnimationFrame(() => {
			if (!needsMapRemountRef.current) return;
			needsMapRemountRef.current = false;
			setMapSurfaceKey((key) => key + 1);
		});

		return () => cancelAnimationFrame(frame);
	}, [isDragging, isGridDragPending]);

	useEffect(() => {
		if (!isGridDragPending) return;

		const releaseGridDrag = () => {
			if (!isGridDragPendingRef.current) return;
			isGridDragPendingRef.current = false;
			setIsGridDragPending(false);
		};
		window.addEventListener("mouseup", releaseGridDrag, true);
		window.addEventListener("pointerup", releaseGridDrag, true);
		window.addEventListener("pointercancel", releaseGridDrag, true);
		window.addEventListener("blur", releaseGridDrag);

		return () => {
			window.removeEventListener("mouseup", releaseGridDrag, true);
			window.removeEventListener("pointerup", releaseGridDrag, true);
			window.removeEventListener("pointercancel", releaseGridDrag, true);
			window.removeEventListener("blur", releaseGridDrag);
		};
	}, [isGridDragPending]);

	useEffect(() => {
		if (mode !== "edit") {
			setIsLocationEditing(false);
			setGeolocationError(null);
		}
	}, [mode]);

	function commitCamera(
		nextCamera: MapCamera,
		nextCaption = item.data.caption,
	) {
		if (!interactive || !onCommand) return;
		if (
			isSameMapCamera(normalizedCamera, nextCamera) &&
			nextCaption === item.data.caption
		)
			return;

		onCommand({
			type: "update-data",
			itemId: item.id,
			data: {
				...item.data,
				latitude: nextCamera.latitude,
				longitude: nextCamera.longitude,
				zoom: nextCamera.zoom,
				caption: nextCaption,
			},
		});
	}

	function handleLocationSelect(result: MapSearchResult) {
		if (!interactive) return;

		const nextCamera = {
			...normalizedCamera,
			latitude: result.latitude,
			longitude: result.longitude,
		};
		const nextCaption = item.data.caption?.trim()
			? item.data.caption
			: result.name || result.address;

		setGeolocationError(null);
		commitCamera(nextCamera, nextCaption);
		mapSurfaceRef.current?.flyTo(nextCamera);
	}

	function retryMap() {
		setMapError(null);
		setMapSurfaceKey((key) => key + 1);
	}

	const href = toGoogleMapsUrl(item.data.latitude, item.data.longitude);

	function handleGridDragStart(
		event: ReactMouseEvent<HTMLDivElement> | ReactPointerEvent<HTMLDivElement>,
	) {
		const target = event.target;
		if (!(target instanceof Element)) return;
		if (
			target.closest(
				"a,button,input,textarea,select,video,[contenteditable='true'],[data-grid-item-drag-cancel='true']",
			)
		)
			return;

		if (isGridDragPendingRef.current) return;
		isGridDragPendingRef.current = true;
		needsMapRemountRef.current = true;
		mapSurfaceRef.current?.suspendInteractions();
		setIsGridDragPending(true);
	}

	return (
		<div
			className="relative size-full overflow-hidden rounded-[inherit] bg-muted surface-line"
			onMouseDownCapture={handleGridDragStart}
			onPointerDownCapture={handleGridDragStart}
		>
			<div className="absolute inset-0">
				{showMapFallback ? (
					<MapFallback camera={normalizedCamera} onRetry={retryMap} />
				) : (
					<MapViewportGate
						forceMount={mode === "edit" || interactive}
						placeholder={
							<div
								aria-hidden="true"
								className="size-full min-h-0 bg-muted/50"
							/>
						}
					>
						<div
							data-grid-item-drag-cancel={interactive ? "true" : undefined}
							className="relative size-full min-h-0"
						>
							<MapboxMapSurface
								key={mapSurfaceKey}
								ref={mapSurfaceRef}
								accessToken={accessToken}
								camera={normalizedCamera}
								interactive={interactive}
								onMoveEnd={commitCamera}
								onGeolocate={(nextCamera) => {
									setGeolocationError(null);
									commitCamera(nextCamera);
								}}
								onGeolocateError={(error) => {
									setGeolocationError(error ?? true);
								}}
								onError={setMapError}
							/>
						</div>
					</MapViewportGate>
				)}
			</div>

			<div className="pointer-events-none relative size-full">
				<div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
					<div />
					<div className="pointer-events-auto flex items-center gap-2">
						{mode === "edit" ? (
							<div data-grid-item-drag-cancel="true">
								<Button
									type="button"
									variant={isLocationEditing ? "default" : "outline"}
									size="sm"
									aria-pressed={isLocationEditing}
									aria-label={
										isLocationEditing
											? "Stop editing location"
											: "Edit location"
									}
									onClick={() => {
										setIsLocationEditing((editing) => !editing);
										setGeolocationError(null);
									}}
								>
									{isLocationEditing
										? "Stop editing location"
										: "Edit location"}
								</Button>
							</div>
						) : null}
						{showMapFallback ? null : (
							<ItemExternalAction href={href} ariaLabel="Open Google Maps" />
						)}
					</div>
				</div>

				{interactive ? (
					<div
						data-grid-item-drag-cancel="true"
						className="pointer-events-auto absolute inset-x-0 top-12 z-20 space-y-2"
					>
						<MapLocationSearch
							accessToken={accessToken}
							disabled={!interactive}
							onSelect={handleLocationSelect}
						/>
					</div>
				) : null}

				{geolocationError ? (
					<output
						aria-live="polite"
						className="pointer-events-auto absolute inset-x-0 top-12 z-20 mx-4 rounded-full bg-background/90 px-3 py-1 text-center text-xs font-medium text-destructive shadow-sm"
					>
						Couldn’t determine your location. Try again.
					</output>
				) : null}
			</div>

			<div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 text-white">
				{mode === "edit" ? (
					<Input
						data-bro-ignore="true"
						value={item.data.caption ?? ""}
						placeholder="Caption"
						onChange={(event) =>
							onCommand?.({
								type: "update-data",
								itemId: item.id,
								data: { ...item.data, caption: event.target.value },
							})
						}
						className="pointer-events-auto field-sizing-content h-7.5 w-fit max-w-full min-w-24 truncate rounded-sm ring ring-border bg-white/100 px-2 py-0 text-xs font-medium text-foreground shadow-xs placeholder:text-gray-bright/60"
					/>
				) : (
					<p className="min-w-0 max-w-full truncate text-xs font-medium ring ring-border bg-white/100">
						{item.data.caption?.trim()}
					</p>
				)}
			</div>
		</div>
	);
}
