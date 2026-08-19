import type {
	Breakpoint,
	ItemLayout,
	ItemType,
	PageItemLayouts,
} from "@grabbin/api/grid";

export type { Breakpoint, ItemLayout, ItemType, PageItemLayouts };
export type PresetName =
	| "fullBanner"
	| "halfBanner"
	| "squareSmall"
	| "landscape"
	| "squareLarge"
	| "portrait";
export type LayoutMap = Record<string, ItemLayout>;
export type DragDelta = {
	x: number;
	y: number;
	firstCrossedAxis?: "x" | "y";
};

export const columnsByBreakpoint: Record<Breakpoint, number> = {
	wide: 4,
	compact: 2,
};

export const gridMargin: [number, number] = [36, 36];
export const gridRowHeight = 68;
export const gridContainerPadding: [number, number] = [0, 0];

const squareGridSize = gridRowHeight * 2 + gridMargin[1];

export function getGridWidth(cols: number): number {
	return squareGridSize * cols + gridMargin[0] * (cols - 1);
}

const allowedPresets: Record<ItemType, readonly PresetName[]> = {
	section: ["fullBanner"],
	media: ["squareSmall", "landscape", "portrait", "squareLarge"],
	map: ["squareSmall", "landscape", "portrait", "squareLarge"],
	link: ["squareSmall", "halfBanner", "landscape", "portrait", "squareLarge"],
	text: ["squareSmall", "halfBanner", "landscape", "portrait", "squareLarge"],
};

const geometry: Record<PresetName, ItemLayout> = {
	fullBanner: {
		x: 0,
		y: 0,
		w: 4,
		h: 1,
	},
	halfBanner: {
		x: 0,
		y: 0,
		w: 2,
		h: 1,
	},
	squareSmall: {
		x: 0,
		y: 0,
		w: 1,
		h: 2,
	},
	landscape: { x: 0, y: 0, w: 2, h: 2 },
	squareLarge: {
		x: 0,
		y: 0,
		w: 2,
		h: 4,
	},
	portrait: { x: 0, y: 0, w: 1, h: 4 },
};

export function getAllowedPresets(type: ItemType): PresetName[] {
	return [...allowedPresets[type]];
}

export function getPresetGeometry(
	preset: PresetName,
	breakpoint: Breakpoint,
): ItemLayout {
	const size = geometry[preset];
	if (preset === "fullBanner" && breakpoint === "compact") {
		return { ...size, w: 2 };
	}
	return { ...size };
}

export function getDefaultPreset(type: ItemType): PresetName {
	return type === "section" ? "fullBanner" : "squareSmall";
}

export function getColumns(breakpoint: Breakpoint): number {
	return columnsByBreakpoint[breakpoint];
}

function overlaps(a: ItemLayout, b: ItemLayout): boolean {
	return (
		a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
	);
}

function isLegal(
	layout: ItemLayout,
	existing: LayoutMap,
	cols: number,
): boolean {
	if (
		layout.x < 0 ||
		layout.y < 0 ||
		layout.w < 1 ||
		layout.h < 1 ||
		layout.x + layout.w > cols
	) {
		return false;
	}
	return Object.values(existing).every((item) => !overlaps(layout, item));
}

export function placeAtFirstAvailable(
	layouts: LayoutMap,
	itemSize: Pick<ItemLayout, "w" | "h">,
	cols: number,
): ItemLayout {
	if (itemSize.w < 1 || itemSize.h < 1 || itemSize.w > cols) {
		throw new Error("Item size cannot fit within the grid columns.");
	}
	for (let y = 0; ; y += 1) {
		for (let x = 0; x <= cols - itemSize.w; x += 1) {
			const candidate = {
				x,
				y,
				w: itemSize.w,
				h: itemSize.h,
			};
			if (isLegal(candidate, layouts, cols)) {
				return candidate;
			}
		}
	}
}

export function compactWithGravity(
	layouts: LayoutMap,
	cols: number,
): LayoutMap {
	const result = Object.fromEntries(
		Object.entries(layouts).map(([id, layout]) => [id, { ...layout }]),
	) as LayoutMap;

	const orderedIds = Object.keys(result).sort(
		(a, b) =>
			result[a].y - result[b].y ||
			result[a].x - result[b].x ||
			a.localeCompare(b),
	);

	for (const id of orderedIds) {
		const current = result[id];
		if (!current) continue;
		const others = Object.fromEntries(
			Object.entries(result).filter(([otherId]) => otherId !== id),
		) as LayoutMap;

		let next = { ...current };
		while (next.y > 0) {
			const candidate = {
				...next,
				y: next.y - 1,
			};
			if (!isLegal(candidate, others, cols)) break;
			next = candidate;
		}
		result[id] = next;
	}

	validateLayout(result, cols);
	return result;
}

export function validateLayout(layouts: LayoutMap, cols: number): void {
	for (const [id, layout] of Object.entries(layouts)) {
		if (!isLegal(layout, {}, cols)) {
			throw new Error(`Invalid layout for item ${id}.`);
		}
	}

	const entries = Object.entries(layouts);
	for (let index = 0; index < entries.length; index += 1) {
		for (
			let nextIndex = index + 1;
			nextIndex < entries.length;
			nextIndex += 1
		) {
			if (overlaps(entries[index][1], entries[nextIndex][1])) {
				throw new Error(
					`Items ${entries[index][0]} and ${entries[nextIndex][0]} overlap.`,
				);
			}
		}
	}
}

function resolveAxis(delta: DragDelta): "x" | "y" {
	if (Math.abs(delta.x) > Math.abs(delta.y)) return "x";
	if (Math.abs(delta.y) > Math.abs(delta.x)) return "y";
	return delta.firstCrossedAxis ?? (delta.x !== 0 ? "x" : "y");
}

function nearestLegalOnAxis(
	item: ItemLayout,
	target: number,
	axis: "x" | "y",
	others: LayoutMap,
	cols: number,
): ItemLayout | null {
	const max = axis === "x" ? cols - item.w : Math.max(0, target + item.h + 1);
	const candidates = Array.from({ length: max + 1 }, (_, value) => value).sort(
		(a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b,
	);

	for (const value of candidates) {
		const candidate = {
			...item,
			[axis]: value,
		};
		if (isLegal(candidate, others, cols)) return candidate;
	}
	return null;
}

export function resolveAxisAwareSwap(
	layouts: LayoutMap,
	draggedId: string,
	candidate: ItemLayout,
	dragDelta: DragDelta,
	cols: number,
): LayoutMap {
	const dragged = layouts[draggedId];
	if (!dragged) throw new Error(`Unknown dragged item ${draggedId}.`);

	const collisions = Object.entries(layouts)
		.filter(([id, layout]) => id !== draggedId && overlaps(candidate, layout))
		.sort(([a], [b]) => a.localeCompare(b));
	const result: LayoutMap = {
		...Object.fromEntries(
			Object.entries(layouts).map(([id, layout]) => [id, { ...layout }]),
		),
		[draggedId]: { ...candidate },
	};

	if (collisions.length === 0) {
		return compactWithGravity(result, cols);
	}

	const axis = resolveAxis(dragDelta);
	for (const [collidedId, collided] of collisions) {
		const others = Object.fromEntries(
			Object.entries(result).filter(([id]) => id !== collidedId),
		) as LayoutMap;
		const target = axis === "x" ? dragged.x : dragged.y;
		const exact = {
			...collided,
			[axis]: target,
		};
		result[collidedId] = isLegal(exact, others, cols)
			? exact
			: (nearestLegalOnAxis(collided, target, axis, others, cols) ??
				placeAtFirstAvailable(others, collided, cols));
	}

	return compactWithGravity(result, cols);
}

export function validateLayoutForItem(
	item: {
		type: ItemType;
		preset: PresetName;
		layout: ItemLayout;
	},
	breakpoint: Breakpoint,
): void {
	if (!allowedPresets[item.type].includes(item.preset)) {
		throw new Error(`${item.preset} is not allowed for ${item.type}.`);
	}

	const expected = getPresetGeometry(item.preset, breakpoint);
	if (item.layout.w !== expected.w || item.layout.h !== expected.h) {
		throw new Error(`Layout does not match ${item.preset} geometry.`);
	}
	validateLayout({ item: item.layout }, getColumns(breakpoint));
}
