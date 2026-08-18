import { Crop, Layout, MonitorMobbile, Widget5 } from "reicon-react";

export const FEATURE_ITEMS = [
	{
		icon: Widget5,
		title: "A widget for everything",
		description:
			"Bring links, text, images, videos, maps, and more together on one page.",
		thumbnail: "",
		preview: "rich-content",
	},
	{
		icon: Layout,
		title: "Flexible widget sizes",
		description:
			"Choose the size that works best for each piece of content.",
		thumbnail: "",
		preview: "flexible-widget-sizes",
	},
	{
		icon: Crop,
		title: "Perfect the frame",
		description:
			"Crop and position every image so it looks right in your layout.",
		thumbnail: "",
		preview: "perfect-the-frame",
	},
	{
		icon: MonitorMobbile,
		title: "One page, every screen",
		description:
			"Switch between mobile and desktop layouts to keep your page looking great everywhere.",
		thumbnail: "",
		preview: "drag-drop",
	},
] as const;
