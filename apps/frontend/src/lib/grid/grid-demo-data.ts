import { createGridItem } from "./item-factory";
import type { GridItem, ItemType } from "./types";

const demoTypes: ItemType[] = ["text", "link", "map", "media", "section"];

/** Creates local-only items for measuring grid entrance performance. */
export function createGridDemoItems(
	items: readonly GridItem[],
	count: number,
): GridItem[] {
	const nextItems = [...items];
	const demoItems: GridItem[] = [];

	for (let index = 0; index < count; index += 1) {
		const type = demoTypes[index % demoTypes.length];
		const item = createGridItem({
			items: nextItems,
			itemType: type,
			url: `https://example.com/demo-${index + 1}`,
		});
		const demoItem = {
			...item,
			id: `grid-demo-${index + 1}`,
		};
		demoItems.push(demoItem);
		nextItems.push(demoItem);
	}

	return demoItems;
}
