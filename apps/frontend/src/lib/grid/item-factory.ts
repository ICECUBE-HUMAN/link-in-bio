import { createInitialLinkMetadata } from "@sinabro/api";
import {
	getColumns,
	getDefaultPreset,
	getPresetGeometry,
	placeAtFirstAvailable,
} from "@sinabro/grid-layout";
import { DEFAULT_MAP_LOCATION, DEFAULT_MAP_ZOOM } from "../map/map-config";
import { toLayoutMap } from "./layout-engine";
import type { Breakpoint, GridItem, ItemType } from "./types";

const breakpoints: Breakpoint[] = ["wide", "compact"];

export function createGridItem({
	items,
	itemType,
	url,
	media,
}: {
	items: readonly GridItem[];
	itemType: ItemType;
	url?: string;
	media?: { mimeType: string; previewUrl: string };
}): GridItem {
	const id = crypto.randomUUID();
	const preset = getDefaultPreset(itemType);
	const layouts = Object.fromEntries(
		breakpoints.map((breakpoint) => [
			breakpoint,
			placeAtFirstAvailable(
				toLayoutMap(items, breakpoint),
				getPresetGeometry(preset, breakpoint),
				getColumns(breakpoint),
			),
		]),
	) as GridItem["layouts"];
	const now = new Date().toISOString();
	const base = {
		id,
		style: {},
		layouts,
		createdAt: now,
		updatedAt: now,
		preset,
	};

	switch (itemType) {
		case "text":
			return { ...base, type: itemType, data: { text: "" } };
		case "media":
			return {
				...base,
				type: itemType,
				data: {
					objectKey: "pending",
					mimeType: media?.mimeType ?? "image/jpeg",
					mediaUrl: media?.previewUrl,
				},
			};
		case "map":
			return {
				...base,
				type: itemType,
				data: {
					...DEFAULT_MAP_LOCATION,
					zoom: DEFAULT_MAP_ZOOM,
				},
			};
		case "section":
			return { ...base, type: itemType, data: { title: "" } };
		case "link":
			return {
				...base,
				type: itemType,
				data: {
					url: url ?? "https://example.com",
					metadata: createInitialLinkMetadata(url ?? "https://example.com"),
				},
			};
	}
}
