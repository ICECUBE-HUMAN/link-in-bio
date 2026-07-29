import {
	getColumns,
	getDefaultPreset,
	getPresetGeometry,
	placeAtFirstAvailable,
} from "@sinabro/grid-layout";
import { toLayoutMap } from "./layout-engine";
import type { Breakpoint, GridItem, ItemType } from "./types";

const breakpoints: Breakpoint[] = ["wide", "compact"];

export function createGridItem({
	items,
	itemType,
	url,
}: {
	items: readonly GridItem[];
	itemType: ItemType;
	url?: string;
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
				data: { objectKey: "pending", mimeType: "image/jpeg" },
			};
		case "map":
			return {
				...base,
				type: itemType,
				data: { latitude: 37.5665, longitude: 126.978 },
			};
		case "section":
			return { ...base, type: itemType, data: { title: "Section" } };
		case "link":
			return {
				...base,
				type: itemType,
				data: { url: url ?? "https://example.com" },
			};
	}
}
