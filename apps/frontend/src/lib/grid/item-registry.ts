import type { ReactNode } from "react";
import { ItemControls } from "@/components/grid/item-controls";
import { LinkItemRenderer } from "@/components/grid/renderers/link";
import { MapItemRenderer } from "@/components/grid/renderers/map";
import { MediaItemRenderer } from "@/components/grid/renderers/media";
import { SectionItemRenderer } from "@/components/grid/renderers/section";
import { TextItemRenderer } from "@/components/grid/renderers/text";
import { getAllowedPresets } from "@/lib/grid/layout-presets";
import { inferPresetFromLayout } from "@/lib/grid/layout-engine";
import type {
	Breakpoint,
	GridEditorCommand,
	GridItem,
	GridItemByType,
	ItemType,
	PresetName,
} from "@/lib/grid/types";
import type { PageMode } from "@/lib/page/page-mode";

export type GridItemPrimaryAction =
	| {
			kind: "open-link";
			href: string;
			label: string;
	  }
	| {
			kind: "open-media";
			href: string;
			label: string;
	  }
	| {
			kind: "open-map";
			href: string;
			label: string;
	  };

export type GridItemControlCommand = "manage-link" | "apply-preset";

export type GridItemCommand =
	| {
			type: "manage-link";
			itemId: string;
	  }
	| GridEditorCommand;

export type GridItemCommandHandler = (command: GridItemCommand) => void;

export type ItemControlCapability = {
	command: GridItemControlCommand;
	label: string;
	preset?: PresetName;
};

export type ItemCapabilities = {
	allowedPresets: readonly PresetName[];
	controls: readonly ItemControlCapability[];
	canRender: boolean;
	primaryAction: GridItemPrimaryAction | null;
};

export type ItemCapabilityContext = {
	breakpoint: Breakpoint;
	mode: PageMode;
};

export type ItemRendererProps<Item extends GridItem = GridItem> = {
	item: Item;
	breakpoint: Breakpoint;
	preset: PresetName;
	mode: PageMode;
	onCommand?: GridItemCommandHandler;
};

export type ItemControlsProps<Item extends GridItem = GridItem> = {
	item: Item;
	capabilities: ItemCapabilities;
	onCommand?: GridItemCommandHandler;
};

export type ItemRendererView<Item extends GridItem = GridItem> = (
	props: ItemRendererProps<Item>,
) => ReactNode;

export type ItemControlsView<Item extends GridItem = GridItem> = (
	props: ItemControlsProps<Item>,
) => ReactNode;

export type ItemEditorView<Item extends GridItem = GridItem> = (
	props: ItemRendererProps<Item>,
) => ReactNode;

export type ItemViewRegistration<Item extends GridItem = GridItem> = {
	renderer: ItemRendererView<Item>;
	editor: ItemEditorView<Item> | null;
	controls: ItemControlsView<Item>;
};

export type ItemViewRegistry = {
	[Type in ItemType]: ItemViewRegistration<GridItemByType<Type>>;
};

export function getItemViewRegistration(
	item: GridItem,
): ItemViewRegistration<GridItem> {
	return itemViewRegistry[
		item.type
	] as unknown as ItemViewRegistration<GridItem>;
}

function getPrimaryAction(item: GridItem): GridItemPrimaryAction | null {
	switch (item.type) {
		case "media":
			return item.data.mediaUrl
				? {
						kind: "open-media",
						href: item.data.mediaUrl,
						label: "Open media",
					}
				: null;
		case "map":
			return {
				kind: "open-map",
				href: toGoogleMapsUrl(item.data.latitude, item.data.longitude),
				label: "Google Maps",
			};
		case "link":
			return {
				kind: "open-link",
				href: item.data.url,
				label: "Open",
			};
		default:
			return null;
	}
}

export function toGoogleMapsUrl(latitude: number, longitude: number): string {
	const params = new URLSearchParams({
		api: "1",
		query: `${latitude},${longitude}`,
	});

	return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function getItemCapabilities(
	item: GridItem,
	context: ItemCapabilityContext,
): ItemCapabilities {
	const allowedPresets = getAllowedPresets(item.type);
	const preset = inferPresetFromLayout(
		item.type,
		item.layouts[context.breakpoint],
		context.breakpoint,
	);
	const canRender = preset !== null && allowedPresets.includes(preset);
	const controls: ItemControlCapability[] = [];

	if (canRender && context.mode === "edit" && allowedPresets.length > 1) {
		for (const nextPreset of allowedPresets) {
			if (nextPreset === preset) continue;
			controls.push({
				command: "apply-preset",
				label: getPresetControlLabel(nextPreset),
				preset: nextPreset,
			});
		}
	}

	if (canRender && context.mode === "edit" && item.type === "text") {
		controls.push({
			command: "manage-link",
			label: item.data.link ? "Change link" : "Add link",
		});
	}

	return {
		allowedPresets,
		controls,
		canRender,
		primaryAction: canRender ? getPrimaryAction(item) : null,
	};
}

function getPresetControlLabel(preset: PresetName): string {
	switch (preset) {
		case "halfBanner":
			return "Half";
		case "squareSmall":
			return "S";
		case "landscape":
			return "Wide";
		case "squareLarge":
			return "Tall";
		case "portrait":
			return "Portrait";
		case "fullBanner":
			return "Full";
	}
}

export const itemViewRegistry: ItemViewRegistry = {
	text: {
		renderer: TextItemRenderer,
		editor: null,
		controls: ItemControls,
	},
	media: {
		renderer: MediaItemRenderer,
		editor: null,
		controls: ItemControls,
	},
	map: {
		renderer: MapItemRenderer,
		editor: null,
		controls: ItemControls,
	},
	section: {
		renderer: SectionItemRenderer,
		editor: null,
		controls: ItemControls,
	},
	link: {
		renderer: LinkItemRenderer,
		editor: null,
		controls: ItemControls,
	},
};
