import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import MapboxMap, {
	GeolocateControl,
	type GeolocateResultEvent,
	type ErrorEvent as MapboxErrorEvent,
	type MapEvent,
	type MapRef,
	NavigationControl,
	type ViewStateChangeEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
	MAP_ZOOM_MAX,
	MAP_ZOOM_MIN,
	MAPBOX_STYLE_URL,
	type MapCamera,
	sanitizeMapCamera,
} from "@/lib/map/map-config";

export type MapboxMapSurfaceHandle = {
	flyTo(camera: MapCamera): void;
};

export type MapboxMapSurfaceProps = {
	accessToken: string;
	camera: MapCamera;
	interactive: boolean;
	onMoveEnd(camera: MapCamera): void;
	onGeolocate(camera: MapCamera): void;
	onGeolocateError(error: unknown): void;
	onError(error: unknown): void;
};

function getFlyToDuration() {
	return typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? 0
		: 450;
}

export const MapboxMapSurface = forwardRef<
	MapboxMapSurfaceHandle,
	MapboxMapSurfaceProps
>(function MapboxMapSurface(
	{
		accessToken,
		camera,
		interactive,
		onMoveEnd,
		onGeolocate,
		onGeolocateError,
		onError,
	},
	ref,
) {
	const mapRef = useRef<MapRef>(null);
	const mapErrorReportedRef = useRef(false);

	useImperativeHandle(
		ref,
		() => ({
			flyTo(nextCamera) {
				mapRef.current?.flyTo({
					center: [nextCamera.longitude, nextCamera.latitude],
					zoom: nextCamera.zoom,
					duration: getFlyToDuration(),
				});
			},
		}),
		[],
	);

	useEffect(() => {
		if (!interactive) return;
		mapRef.current?.getMap().touchZoomRotate.disableRotation();
	}, [interactive]);

	function handleMoveEnd(event: ViewStateChangeEvent) {
		const nextCamera = sanitizeMapCamera(event.viewState);
		if (nextCamera) onMoveEnd(nextCamera);
	}

	function handleGeolocate(event: GeolocateResultEvent) {
		const nextCamera = sanitizeMapCamera({
			latitude: event.coords.latitude,
			longitude: event.coords.longitude,
			zoom: mapRef.current?.getZoom() ?? camera.zoom,
		});
		if (nextCamera) onGeolocate(nextCamera);
	}

	function handleMapError(event: MapboxErrorEvent) {
		if (mapErrorReportedRef.current) return;
		mapErrorReportedRef.current = true;
		onError(event);
	}

	function handleMapLoad(event: MapEvent) {
		event.target.touchZoomRotate.disableRotation();
	}

	return (
		<div className="relative size-full min-h-0 overflow-hidden">
			<MapboxMap
				ref={mapRef}
				mapLib={import("mapbox-gl")}
				mapboxAccessToken={accessToken}
				mapStyle={MAPBOX_STYLE_URL}
				initialViewState={{
					longitude: camera.longitude,
					latitude: camera.latitude,
					zoom: camera.zoom,
				}}
				projection="mercator"
				pitch={0}
				maxPitch={0}
				dragRotate={false}
				touchPitch={false}
				dragPan={interactive}
				scrollZoom={interactive}
				doubleClickZoom={interactive}
				keyboard={interactive}
				touchZoomRotate={interactive}
				minZoom={MAP_ZOOM_MIN}
				maxZoom={MAP_ZOOM_MAX}
				style={{ height: "100%", width: "100%" }}
				onMoveEnd={handleMoveEnd}
				onLoad={handleMapLoad}
				onError={handleMapError}
			>
				{interactive ? (
					<>
						<NavigationControl showZoom showCompass={false} />
						<GeolocateControl
							trackUserLocation={false}
							onGeolocate={handleGeolocate}
							onError={onGeolocateError}
						/>
					</>
				) : null}
			</MapboxMap>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
			>
				<div className="relative size-5">
					<span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white shadow-[0_0_2px_var(--color-foreground)]" />
					<span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-white shadow-[0_0_2px_var(--color-foreground)]" />
					<span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white shadow-sm" />
				</div>
			</div>
		</div>
	);
});
