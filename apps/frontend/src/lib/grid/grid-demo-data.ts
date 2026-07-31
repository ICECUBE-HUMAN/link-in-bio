import { createGridItem } from "./item-factory";
import type { GridItem, ItemType } from "./types";

const demoTypes: ItemType[] = ["text", "link", "map", "media", "section"];

const linkProviderDemoUrls = [
	"https://youtube.com/@sinabro",
	"https://discord.gg/sinabro",
	"https://github.com/sinabro",
	"https://x.com/sinabro",
	"https://open.spotify.com/artist/sinabro",
	"https://threads.net/@sinabro",
	"https://instagram.com/sinabro",
	"https://buymeacoffee.com/sinabro",
	"https://linkedin.com/in/sinabro",
	"https://chzzk.naver.com/sinabro",
	"https://figma.com/@sinabro",
	"https://ko-fi.com/sinabro",
	"https://gumroad.com/sinabro",
	"https://medium.com/@sinabro",
	"https://patreon.com/sinabro",
	"https://producthunt.com/@sinabro",
	"https://reddit.com/u/sinabro",
	"https://tiktok.com/@sinabro",
	"https://twitch.tv/sinabro",
	"https://behance.net/sinabro",
	"https://dribbble.com/sinabro",
] as const;

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

/** Creates local-only link items for inspecting every configured provider. */
export function createLinkProviderDemoItems(
	items: readonly GridItem[],
): GridItem[] {
	const nextItems = [...items];
	return linkProviderDemoUrls.map((url, index) => {
		const item = createGridItem({
			items: nextItems,
			itemType: "link",
			url,
		});
		const demoItem = {
			...item,
			id: `link-provider-demo-${index + 1}`,
		};
		nextItems.push(demoItem);
		return demoItem;
	});
}
