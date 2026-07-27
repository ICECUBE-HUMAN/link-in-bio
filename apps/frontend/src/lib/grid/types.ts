import type {
	Breakpoint,
	DragDelta,
	ItemLayout,
	ItemType,
	LayoutMap,
	PageItemLayouts,
	PresetName,
} from "@sinabro/grid-layout";

export type {
	Breakpoint,
	DragDelta,
	ItemLayout,
	ItemType,
	LayoutMap,
	PageItemLayouts,
	PresetName,
};

export type GridItem = {
	id: string;
	type: ItemType;
	preset: PresetName;
	layouts: PageItemLayouts;
};
