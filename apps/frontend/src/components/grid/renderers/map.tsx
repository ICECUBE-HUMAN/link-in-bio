import { useEffect, useRef, useState } from "react";
import { MapFallback } from "@/components/grid/map/map-fallback";
import { MapLocationSearch } from "@/components/grid/map/map-location-search";
import { MapViewportGate } from "@/components/grid/map/map-viewport-gate";
import {
	MapboxMapSurface,
	type MapboxMapSurfaceHandle,
} from "@/components/grid/map/mapbox-map-surface";
import { Button } from "@/components/ui/button";
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

function formatCoordinate(value: number) {
	return value.toFixed(5);
}

export function MapItemRenderer({
	item,
	mode,
	onCommand,
}: ItemRendererProps<GridItemByType<"map">>) {
	const [isLocationEditing, setIsLocationEditing] = useState(false);
	const [mapError, setMapError] = useState<unknown>(null);
	const [geolocationError, setGeolocationError] = useState<unknown>(null);
	const [mapSurfaceKey, setMapSurfaceKey] = useState(0);
	const mapSurfaceRef = useRef<MapboxMapSurfaceHandle>(null);
	const accessToken = getMapboxAccessToken();
	const normalizedCamera = normalizeMapCamera(item.data);
	const interactive = mode === "edit" && isLocationEditing;
	const showMapFallback = !accessToken || mapError !== null;

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

	return (
		<div className="relative size-full overflow-hidden bg-[radial-gradient(circle_at_top_left,var(--color-primary)/16,transparent_55%),linear-gradient(135deg,var(--color-muted),color-mix(in_oklch,var(--color-muted),white_28%))] p-4">
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

			<div className="pointer-events-none relative flex size-full flex-col justify-between gap-4">
				<div className="flex items-start justify-between gap-3">
					{showMapFallback ? (
						<div />
					) : (
						<div className="rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
							Coordinates
						</div>
					)}
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
							<a
								href={href}
								target="_blank"
								rel="noreferrer"
								className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/85"
							>
								Google Maps
							</a>
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
						{geolocationError ? (
							<output
								aria-live="polite"
								className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-destructive shadow-sm"
							>
								Couldn’t determine your location. Try again.
							</output>
						) : null}
					</div>
				) : null}

				<div className="space-y-2">
					{showMapFallback ? null : (
						<p className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
							{formatCoordinate(item.data.latitude)},{" "}
							{formatCoordinate(item.data.longitude)}
						</p>
					)}
					{item.data.caption?.trim() ? (
						<div className="pointer-events-auto inline-flex max-w-full rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
							<p
								contentEditable={mode === "edit"}
								suppressContentEditableWarning
								onBlur={(event) => {
									if (!onCommand) return;
									onCommand({
										type: "update-data",
										itemId: item.id,
										data: {
											...item.data,
											caption: event.currentTarget.textContent ?? "",
										},
									});
								}}
								className="truncate"
							>
								{item.data.caption}
							</p>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
