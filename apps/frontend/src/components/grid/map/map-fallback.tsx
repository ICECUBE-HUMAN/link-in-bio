import { Button } from "@/components/ui/button";
import { toGoogleMapsUrl } from "@/lib/grid/item-registry";
import type { MapCamera } from "@/lib/map/map-config";

export type MapFallbackProps = {
	camera: MapCamera;
	onRetry(): void;
};

function formatCoordinate(value: number) {
	return value.toFixed(5);
}

export function MapFallback({ camera, onRetry }: MapFallbackProps) {
	return (
		<div className="flex size-full min-h-0 items-center justify-center bg-muted/50 p-4 text-center">
			<div className="flex max-w-xs flex-col items-center gap-3">
				<div className="space-y-1">
					<p className="text-sm font-semibold text-foreground">
						Map unavailable
					</p>
					<p className="text-sm tabular-nums text-muted-foreground">
						{formatCoordinate(camera.latitude)},{" "}
						{formatCoordinate(camera.longitude)}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button type="button" variant="outline" size="sm" onClick={onRetry}>
						Retry
					</Button>
					<a
						href={toGoogleMapsUrl(camera.latitude, camera.longitude)}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-8 items-center justify-center rounded-full bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/85"
					>
						Google Maps
					</a>
				</div>
			</div>
		</div>
	);
}
