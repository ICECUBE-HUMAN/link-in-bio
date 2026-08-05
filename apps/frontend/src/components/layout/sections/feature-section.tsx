import type { PageItemLinkMetadata } from "@sinabro/api";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { GridSection } from "@/components/grid/grid-section";
import { FEATURE_ITEMS } from "@/constant/features";
import { GITHUB_CONTRIBUTION_GRAPH } from "@/constant/github-contribution-graph";
import { createGridItem } from "@/lib/grid/item-factory";
import type { GridItemCommandHandler } from "@/lib/grid/item-registry";
import {
	getPresetGeometry,
	placeAtFirstAvailable,
	toLayoutMap,
} from "@/lib/grid/layout-engine";
import type {
	Breakpoint,
	GridItem,
	GridItemByType,
	ItemLayout,
	ItemType,
	PresetName,
} from "@/lib/grid/types";

const FEATURE_ASSET_BASE_URL =
	"https://pub-166ebfc3d7814935bb3933545a02637d.r2.dev";
const FEATURE_LINK_ICON_BASE_URL = `${FEATURE_ASSET_BASE_URL}/assets/link-provider-icon`;
const FEATURE_BREAKPOINTS: readonly Breakpoint[] = ["wide", "compact"];
type FeatureViewport = "mobile" | "tablet" | "desktop" | "wide";
const FEATURE_PLACEHOLDER_IDS = new Set([
	"feature-placeholder-lilac",
	"feature-placeholder-peach",
	"feature-placeholder-mint",
]);
const FEATURE_PLACEHOLDERS_BY_VIEWPORT: Record<
	FeatureViewport,
	ReadonlySet<string>
> = {
	mobile: new Set(),
	tablet: new Set(["feature-placeholder-lilac"]),
	desktop: new Set(["feature-placeholder-lilac", "feature-placeholder-peach"]),
	wide: new Set(["feature-placeholder-peach", "feature-placeholder-mint"]),
};
const FEATURE_COLUMNS: Record<FeatureViewport, number> = {
	mobile: 2,
	tablet: 3,
	desktop: 4,
	wide: 6,
};
const FEATURE_BREAKPOINT_COLUMNS: Record<Breakpoint, number> = {
	wide: FEATURE_COLUMNS.wide,
	compact: FEATURE_COLUMNS.mobile,
};
const FEATURE_LAYOUTS: Record<FeatureViewport, Record<string, ItemLayout>> = {
	mobile: {
		"feature-media-square": { x: 0, y: 0, w: 2, h: 4 },
		"feature-link-instagram": { x: 0, y: 4, w: 1, h: 4 },
		"feature-media-wide": { x: 1, y: 4, w: 1, h: 4 },
		"feature-text": { x: 0, y: 8, w: 1, h: 2 },
		"feature-link-x": { x: 1, y: 8, w: 1, h: 2 },
		"feature-link-youtube": { x: 0, y: 10, w: 2, h: 4 },
		"feature-link-app-store": { x: 0, y: 14, w: 1, h: 2 },
		"feature-media-portrait": { x: 1, y: 14, w: 1, h: 4 },
		"feature-map": { x: 0, y: 16, w: 1, h: 4 },
		"feature-link-github": { x: 0, y: 20, w: 2, h: 2 },
		"feature-link-web": { x: 0, y: 22, w: 2, h: 2 },
	},
	tablet: {
		"feature-media-square": { x: 0, y: 0, w: 2, h: 4 },
		"feature-media-portrait": { x: 2, y: 0, w: 1, h: 4 },
		"feature-link-instagram": { x: 0, y: 4, w: 1, h: 4 },
		"feature-media-wide": { x: 1, y: 4, w: 2, h: 2 },
		"feature-text": { x: 0, y: 6, w: 1, h: 2 },
		"feature-link-x": { x: 1, y: 6, w: 1, h: 2 },
		"feature-link-web": { x: 2, y: 6, w: 1, h: 2 },
		"feature-link-youtube": { x: 0, y: 8, w: 2, h: 4 },
		"feature-map": { x: 2, y: 8, w: 1, h: 4 },
		"feature-link-app-store": { x: 0, y: 12, w: 1, h: 2 },
		"feature-link-github": { x: 1, y: 12, w: 2, h: 2 },
		"feature-placeholder-lilac": { x: 2, y: 14, w: 1, h: 2 },
	},
	desktop: {
		"feature-media-square": { x: 0, y: 0, w: 2, h: 4 },
		"feature-media-portrait": { x: 2, y: 0, w: 1, h: 4 },
		"feature-text": { x: 3, y: 0, w: 1, h: 2 },
		"feature-link-instagram": { x: 0, y: 4, w: 1, h: 4 },
		"feature-media-wide": { x: 1, y: 4, w: 2, h: 2 },
		"feature-link-x": { x: 3, y: 4, w: 1, h: 2 },
		"feature-map": { x: 0, y: 8, w: 2, h: 4 },
		"feature-link-web": { x: 2, y: 8, w: 2, h: 4 },
		"feature-link-youtube": { x: 0, y: 12, w: 2, h: 4 },
		"feature-link-app-store": { x: 0, y: 16, w: 1, h: 2 },
		"feature-link-github": { x: 1, y: 16, w: 2, h: 2 },
		"feature-placeholder-lilac": { x: 3, y: 2, w: 1, h: 2 },
		"feature-placeholder-peach": { x: 2, y: 12, w: 1, h: 2 },
	},
	wide: {
		"feature-media-square": { x: 0, y: 0, w: 2, h: 4 },
		"feature-media-portrait": { x: 2, y: 0, w: 1, h: 4 },
		"feature-link-instagram": { x: 3, y: 0, w: 1, h: 4 },
		"feature-media-wide": { x: 4, y: 0, w: 2, h: 2 },
		"feature-text": { x: 0, y: 4, w: 1, h: 2 },
		"feature-link-x": { x: 5, y: 2, w: 1, h: 2 },
		"feature-link-youtube": { x: 1, y: 4, w: 2, h: 4 },
		"feature-map": { x: 3, y: 4, w: 2, h: 4 },
		"feature-link-app-store": { x: 1, y: 8, w: 1, h: 2 },
		"feature-link-web": { x: 3, y: 8, w: 2, h: 4 },
		"feature-link-github": { x: 0, y: 10, w: 2, h: 2 },
		"feature-placeholder-peach": { x: 5, y: 4, w: 1, h: 2 },
		"feature-placeholder-mint": { x: 0, y: 8, w: 1, h: 2 },
	},
};

// Captured from the shared backend link-provider enrichers on 2026-08-05.
const FEATURE_LINK_METADATA = {
	github: {
		title: "milla-jovovich (Milla J) · GitHub",
		description:
			"Milla Jovovich-Creator/Architect of MemPalace-an open-source platform using structure to save your thoughts, verbatim. Lumi is my CLI agent aka Lu_Code✨ - milla-jovovich",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/github.svg`,
		imageUrl: "https://avatars.githubusercontent.com/u/232237854?v=4?s=400",
		provider: "github",
		providerData: {
			githubUsername: "milla-jovovich",
			followers: 10006,
			githubContributionGraph: GITHUB_CONTRIBUTION_GRAPH,
		},
	},
	x: {
		title: "X (@X) on X",
		description: "what's happening?!",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/x.svg`,
		imageUrl:
			"https://pbs.twimg.com/profile_images/1955359038532653056/OSHY3ewP_200x200.jpg",
		provider: "x",
		providerData: {
			followerCount: 60782872,
			followerCountLabel: "60782872",
			followerCountApproximate: false,
		},
	},
	youtube: {
		title: "Warner Bros.",
		description:
			"Welcome to the official channel for Warner Bros. Subscribe now for all our latest movie trailers, clips and featurettes!",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/youtube.svg`,
		imageUrl: "https://i.ytimg.com/vi/NEmy6vvmuvg/maxresdefault.jpg",
		provider: "youtube",
		providerData: {
			channelId: "UCjmJDM5pRKbUlVIzDYYWb6g",
			channelImageUrl:
				"https://yt3.ggpht.com/yVXKYrUI8hckCQdyUuOWf5ZJk2keT8WO3TV2b8RYk3RKgjz5Rh8v1UsH7Yz2j_hbDQRk32rZ_rM=s800-c-k-c0x00ffffff-no-rj",
			subscriberCount: 12900000,
			recentVideoThumbnailUrls: [
				"https://i.ytimg.com/vi/NEmy6vvmuvg/maxresdefault.jpg",
				"https://i.ytimg.com/vi/ciyj_BvQftM/maxresdefault.jpg",
				"https://i.ytimg.com/vi/viZVbe_sZuE/maxresdefault.jpg",
				"https://i.ytimg.com/vi/imDtMzj0k9Y/maxresdefault.jpg",
			],
		},
	},
	appStore: {
		title: "Spotify: Music and Podcasts App",
		description:
			"Download Spotify: Music and Podcasts by Spotify on the App Store. See screenshots, ratings and reviews, user tips, and more apps like Spotify and…",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/app-store.svg`,
		imageUrl:
			"https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/7c/05/8e/7c058ecf-b386-15ac-9765-31e2d624ec22/Placeholder.mill/1200x630wa.jpg",
		provider: "app-store",
	},
	instagram: {
		title: "Mrs. GREEN APPLE (@mgaband)",
		description:
			"2M Followers, 3 Following, 252 Posts - See photos and videos from Mrs. GREEN APPLE (@mgaband)",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/instagram.svg`,
		imageUrl:
			"https://scontent-ssn1-1.cdninstagram.com/v/t51.82787-19/608826023_18419236633137558_6099778976477500782_n.jpg?stp=dst-jpg_s100x100_tt6&_nc_cat=1&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=bx6ddADZFXcQ7kNvwEGCmU4&_nc_oc=AdpeKM8wuQyIRrooGKMNb-i9P5Iw_dgnkWBnfgSzytThg1wSBl7ylWs7I5rpND-Gjf4&_nc_zt=24&_nc_ht=scontent-ssn1-1.cdninstagram.com&_nc_gid=oeY5s8_YvLYtukTExS2Mbw&_nc_ss=7e60f&oh=00_AQF7yGd1_my45lb1phm4Wm7n0LEokoWGUJM33SExzJ8mRA&oe=6A78D312",
		provider: "instagram",
		providerData: {
			followerCount: 2000000,
			followerCountLabel: "2M",
			followerCountApproximate: true,
		},
	},
	web: {
		title: "Mobbin — UI & UX design inspiration for mobile & web apps",
		description:
			"Save hours of UI & UX research with our library of 400,000+ fully searchable mobile & web app screenshots.",
		faviconUrl: "https://icons.duckduckgo.com/ip3/mobbin.com.ico",
		imageUrl:
			"https://framerusercontent.com/assets/FE3uqmxi41SxsiiVq9JNJC1Pwc.png",
		provider: "generic-web",
	},
} satisfies Record<string, PageItemLinkMetadata>;

function createFeatureItem<T extends ItemType>({
	id,
	items,
	itemType,
	preset,
	url,
	media,
}: {
	id: string;
	items: readonly GridItem[];
	itemType: T;
	preset: PresetName;
	url?: string;
	media?: { mimeType: string; previewUrl: string };
}): GridItemByType<T> {
	const item = createGridItem({ items, itemType, url, media });
	const layouts = Object.fromEntries(
		FEATURE_BREAKPOINTS.map((breakpoint) => [
			breakpoint,
			placeAtFirstAvailable(
				toLayoutMap(items, breakpoint),
				getPresetGeometry(preset, breakpoint),
				FEATURE_BREAKPOINT_COLUMNS[breakpoint],
			),
		]),
	) as GridItem["layouts"];

	return { ...item, id, layouts, preset } as GridItemByType<T>;
}

function createFeatureLayout(viewport: FeatureViewport) {
	return FEATURE_LAYOUTS[viewport];
}

function createFeatureItems(): GridItem[] {
	const items: GridItem[] = [];
	const add = <T extends GridItem>(item: T) => {
		items.push(item);
		return item;
	};

	const mediaOneUrl = `${FEATURE_ASSET_BASE_URL}/assets/features/1.png`;
	const mediaTwoUrl = `${FEATURE_ASSET_BASE_URL}/assets/features/2.png`;
	const mediaThreeUrl = `${FEATURE_ASSET_BASE_URL}/assets/features/3.webm`;

	add(
		createFeatureItem({
			id: "feature-media-wide",
			items,
			itemType: "media",
			preset: "landscape",
			media: { mimeType: "image/png", previewUrl: mediaOneUrl },
		}),
	);
	add(
		createFeatureItem({
			id: "feature-media-square",
			items,
			itemType: "media",
			preset: "squareLarge",
			media: { mimeType: "image/png", previewUrl: mediaTwoUrl },
		}),
	);
	add(
		createFeatureItem({
			id: "feature-media-portrait",
			items,
			itemType: "media",
			preset: "portrait",
			media: { mimeType: "video/webm", previewUrl: mediaThreeUrl },
		}),
	);

	const map = createFeatureItem({
		id: "feature-map",
		items,
		itemType: "map",
		preset: "squareLarge",
	});
	add({
		...map,
		data: {
			...map.data,
			latitude: 43.0618,
			longitude: 141.3545,
			zoom: 9,
			caption: "Where I usually go",
		},
	});

	const text = createFeatureItem({
		id: "feature-text",
		items,
		itemType: "text",
		preset: "squareSmall",
	});
	add({
		...text,
		data: { ...text.data, text: "I only know 25 letters.\n I don't know Y." },
	});

	const links = [
		{
			id: "feature-link-github",
			itemType: "link" as const,
			preset: "landscape" as const,
			url: "https://github.com/milla-jovovich",
			metadata: { ...FEATURE_LINK_METADATA.github, title: "my project" },
		},
		{
			id: "feature-link-x",
			itemType: "link" as const,
			preset: "squareSmall" as const,
			url: "https://x.com/X",
			metadata: { ...FEATURE_LINK_METADATA.x, title: "@maynard" },
		},
		{
			id: "feature-link-youtube",
			itemType: "link" as const,
			preset: "squareLarge" as const,
			url: "https://www.youtube.com/@WarnerBros",
			metadata: { ...FEATURE_LINK_METADATA.youtube, title: "Warner Bros" },
		},
		{
			id: "feature-link-app-store",
			itemType: "link" as const,
			preset: "squareSmall" as const,
			url: "https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580",
			metadata: FEATURE_LINK_METADATA.appStore,
		},
		{
			id: "feature-link-instagram",
			itemType: "link" as const,
			preset: "portrait" as const,
			url: "https://www.instagram.com/mgaband",
			metadata: FEATURE_LINK_METADATA.instagram,
		},
		{
			id: "feature-link-web",
			itemType: "link" as const,
			preset: "squareLarge" as const,
			url: "https://mobbin.com/",
			metadata: FEATURE_LINK_METADATA.web,
		},
	] as const;

	for (const link of links) {
		const item = createFeatureItem({
			id: link.id,
			items,
			itemType: link.itemType,
			preset: link.preset,
			url: link.url,
		});
		add({
			...item,
			data: { ...item.data, metadata: link.metadata },
		});
	}

	for (const [id, backgroundColor] of [
		["feature-placeholder-lilac", "#faf8ff"],
		["feature-placeholder-peach", "#fffaf5"],
		["feature-placeholder-mint", "#f4fcf8"],
	] as const) {
		const placeholder = createFeatureItem({
			id,
			items,
			itemType: "text",
			preset: "squareSmall",
		});
		add({
			...placeholder,
			style: { backgroundColor, chromeLess: true },
		});
	}

	return items;
}

const noopGridCommand: GridItemCommandHandler = () => undefined;

const featurePreviewMap = {
	"drag-drop": DragDropPreview,
	"rich-content": RichContentPreview,
} as const;

function getFeatureViewport(width: number): FeatureViewport {
	if (width >= 80 * 16) return "wide";
	if (width >= 64 * 16) return "desktop";
	if (width >= 45 * 16) return "tablet";
	return "mobile";
}

export default function FeatureSection() {
	const [viewport, setViewport] = useState<FeatureViewport>("mobile");
	useEffect(() => {
		const syncViewport = () =>
			setViewport(getFeatureViewport(window.innerWidth));
		syncViewport();
		window.addEventListener("resize", syncViewport);
		return () => window.removeEventListener("resize", syncViewport);
	}, []);
	const items = useMemo(createFeatureItems, []);
	const visibleItems = useMemo(() => {
		const activePlaceholders = FEATURE_PLACEHOLDERS_BY_VIEWPORT[viewport];
		return items.filter(
			(item) =>
				!FEATURE_PLACEHOLDER_IDS.has(item.id) ||
				activePlaceholders.has(item.id),
		);
	}, [items, viewport]);
	const breakpoint: Breakpoint = viewport === "wide" ? "wide" : "compact";
	const columns = FEATURE_COLUMNS[viewport];
	const layoutOverride = useMemo(
		() => createFeatureLayout(viewport),
		[viewport],
	);

	return (
		<section className="mx-auto flex min-h-lvh max-w-7xl flex-col items-center gap-32 p-4 py-20">
			<div className="flex flex-col items-center gap-2 text-center">
				<h2 className="text-3xl font-medium tracking-tight md:text-4xl">
					<span className="text-brand">More than</span> a list of links
				</h2>
				<p className="text-lg tracking-tight md:text-xl">
					Bring your links, content, and places together in one page that
					represents yourself
				</p>
			</div>

			<div className="feature-section-grid -mx-9 w-[calc(100%+4.5rem)] max-w-none overflow-x-auto overflow-y-visible px-0 sm:overflow-x-visible **:aria-[aria-label*='Google']:hidden">
				<div className="pointer-events-none mx-auto w-full min-w-0" inert>
					<GridSection
						items={visibleItems}
						breakpoint={breakpoint}
						forceBreakpoint={breakpoint}
						columns={columns}
						disableCompaction
						layoutOverride={layoutOverride}
						mode="view"
						onCommand={noopGridCommand}
					/>
				</div>
			</div>
		</section>
	);
}

export function FeatureSection2() {
	return (
		<section className="min-h-lvh flex flex-col items-center gap-16 py-20 p-4 max-w-4xl mx-auto">
			<div className="flex flex-col gap-2 items-center text-center">
				<h2 className="text-3xl font-medium md:text-4xl tracking-tight">
					<span className="text-branZ">More than</span> a list of links
				</h2>
				<p className="text-lg md:text-xl tracking-tight">
					Bring your links, content, and places together in one page that feels
					like yours.
				</p>
			</div>

			<section className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
				{FEATURE_ITEMS.map(
					({ icon: Icon, title, description, thumbnail, preview }, idx) => {
						const Preview = featurePreviewMap[preview];
						const iconColor = idx === 0 ? "text-violet-500" : "text-sky-500";

						return (
							<div
								key={title}
								className="flex h-full w-full flex-col gap-6 rounded-2xl bg-secondary/80 p-8"
							>
								<div className="flex flex-col gap-0">
									<div className="flex flex-col gap-3">
										<div className="rounded-full bg-background size-10 flex items-center justify-center">
											<Icon className={`size-7 ${iconColor}`} />
										</div>
										<p
											className={`text-xl font-medium md:text-2xl ${iconColor}`}
										>
											{title}
										</p>
									</div>
									<p className="text-xl font-medium md:text-2xl">
										{description}
									</p>
								</div>
								<div className="aspect-square w-full rounded-2xl">
									{thumbnail ? (
										<img
											src={thumbnail}
											alt="Thumbnail"
											className="w-full h-full object-contain"
										/>
									) : (
										<Preview />
									)}
								</div>
							</div>
						);
					},
				)}
			</section>
		</section>
	);
}

export function FeatureSection3() {
	return (
		<section className="flex flex-col items-center gap-16 py-20">
			<div className="flex flex-col items-center gap-6 text-center">
				<h2 className="text-3xl font-semibold md:text-5xl">Amazing Features</h2>
			</div>

			<section className="flex w-full max-w-6xl flex-col gap-20 md:gap-12">
				{FEATURE_ITEMS.map(
					({ title, description, thumbnail, preview }, idx) => {
						const Preview = featurePreviewMap[preview];

						return (
							<div
								key={title}
								className={`flex flex-col gap-10 rounded-2xl md:items-center md:gap-40 ${
									idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
								}`}
							>
								<div className="flex flex-1 flex-col gap-4">
									<p className="text-2xl font-medium md:text-3xl">{title}</p>
									<p className="max-w-md text-sm font-light text-gray-bright md:text-base">
										{description}
									</p>
								</div>
								<div className="aspect-square w-full flex-1 rounded-2xl bg-secondary">
									{thumbnail ? (
										<img
											src={thumbnail}
											alt="Thumbnail"
											className="h-full w-full object-contain"
										/>
									) : (
										<Preview />
									)}
								</div>
							</div>
						);
					},
				)}
			</section>
		</section>
	);
}

function DragDropPreview() {
	return <AbstractLayoutPreview animated />;
}

function RichContentPreview() {
	return <AbstractLayoutPreview />;
}

const abstractLayoutItems = [
	{ id: "small", className: "h-14 w-16" },
	{ id: "large", className: "h-28 w-24" },
	{ id: "medium", className: "h-20 w-20" },
];

function AbstractLayoutPreview({ animated = false }: { animated?: boolean }) {
	const shouldReduceMotion = useReducedMotion();
	const [order, setOrder] = useState(() =>
		abstractLayoutItems.map(({ id }) => id),
	);

	useEffect(() => {
		if (!animated || shouldReduceMotion) return;
		const interval = setInterval(() => {
			setOrder((currentOrder) => [
				currentOrder[1],
				currentOrder[2],
				currentOrder[0],
			]);
		}, 1800);
		return () => clearInterval(interval);
	}, [animated, shouldReduceMotion]);

	return (
		<div className="flex h-full items-center justify-center p-8">
			<div className="flex h-56 w-full max-w-sm items-end justify-center gap-3 rounded-2xl border border-foreground/10 bg-background/30 p-8">
				{order.map((id) => {
					const item = abstractLayoutItems.find(
						(layoutItem) => layoutItem.id === id,
					);
					if (!item) return null;

					return (
						<motion.div
							key={item.id}
							layout={animated}
							transition={{
								type: "spring",
								duration: 0.6,
								bounce: 0.12,
							}}
							className={`rounded-xl border border-foreground/10 bg-foreground/10 ${item.className}`}
						/>
					);
				})}
			</div>
		</div>
	);
}
