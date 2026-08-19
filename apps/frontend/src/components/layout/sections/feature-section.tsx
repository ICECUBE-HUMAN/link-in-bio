import { Computer, Smartphone } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Player } from "@remotion/player";
import type { PageItemLinkMetadata } from "@sinabro/api";
import { type CSSProperties, useMemo } from "react";
import {
	AbsoluteFill,
	Easing,
	interpolate,
	interpolateColors,
	useCurrentFrame,
} from "remotion";
import { GridItemShell } from "@/components/grid/grid-item-shell";
import { ItemRenderer } from "@/components/grid/item-renderer";
import { FlexibleWidgetSizesPreview } from "@/components/layout/feature-previews/flexible-widget-sizes-preview";
import { PerfectFramePreview } from "@/components/layout/feature-previews/perfect-frame-preview";
import { FEATURE_ITEMS } from "@/constant/features";
import { GITHUB_CONTRIBUTION_GRAPH } from "@/constant/github-contribution-graph";
import { env } from "@/env";
import { useRevealOnView } from "@/hooks/use-reveal-on-view";
import { createGridItem } from "@/lib/grid/item-factory";
import {
	type GridItemCommandHandler,
	getItemCapabilities,
} from "@/lib/grid/item-registry";
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
	env.VITE_R2_PUBLIC_URL ??
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

const FEATURE_LINK_METADATA = {
	github: {
		title: "Example GitHub project",
		description: "A project link on your page.",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/github.svg`,
		provider: "github",
		providerData: {
			githubContributionGraph: GITHUB_CONTRIBUTION_GRAPH,
		},
	},
	x: {
		title: "Example social profile",
		description: "A social profile link on your page.",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/x.svg`,
		provider: "x",
	},
	youtube: {
		title: "Example video channel",
		description: "A video channel link on your page.",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/youtube.svg`,
		provider: "youtube",
	},
	appStore: {
		title: "Example app",
		description: "An app link on your page.",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/app-store.svg`,
		provider: "app-store",
	},
	instagram: {
		title: "Example photo profile",
		description: "A photo profile link on your page.",
		faviconUrl: `${FEATURE_LINK_ICON_BASE_URL}/instagram.svg`,
		provider: "instagram",
	},
	web: {
		title: "Example website",
		description: "A website link on your page.",
		faviconUrl: "https://icons.duckduckgo.com/ip3/example.com.ico",
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
		data: { ...text.data, text: "I only know 25 letters.\nI don't know Y." },
	});

	const links = [
		{
			id: "feature-link-github",
			itemType: "link" as const,
			preset: "landscape" as const,
			url: "https://github.com/example",
			metadata: { ...FEATURE_LINK_METADATA.github, title: "Example project" },
		},
		{
			id: "feature-link-x",
			itemType: "link" as const,
			preset: "squareSmall" as const,
			url: "https://x.com/example",
			metadata: { ...FEATURE_LINK_METADATA.x, title: "@example" },
		},
		{
			id: "feature-link-youtube",
			itemType: "link" as const,
			preset: "squareLarge" as const,
			url: "https://www.youtube.com/@example",
			metadata: { ...FEATURE_LINK_METADATA.youtube, title: "Example channel" },
		},
		{
			id: "feature-link-app-store",
			itemType: "link" as const,
			preset: "squareSmall" as const,
			url: "https://apps.apple.com/app/example/id000000000",
			metadata: FEATURE_LINK_METADATA.appStore,
		},
		{
			id: "feature-link-instagram",
			itemType: "link" as const,
			preset: "portrait" as const,
			url: "https://www.instagram.com/example",
			metadata: FEATURE_LINK_METADATA.instagram,
		},
		{
			id: "feature-link-web",
			itemType: "link" as const,
			preset: "squareLarge" as const,
			url: "https://example.com/",
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
	"flexible-widget-sizes": FlexibleWidgetSizesPreview,
	"perfect-the-frame": PerfectFramePreview,
} as const;

function getFeatureViewport(width: number): FeatureViewport {
	if (width >= 80 * 16) return "wide";
	if (width >= 64 * 16) return "desktop";
	if (width >= 45 * 16) return "tablet";
	return "mobile";
}

export default function FeatureSection() {
	return (
		<section className="mx-auto flex min-h-lvh max-w-6xl flex-col items-center gap-4 py-20">
			<div className="flex flex-col items-center gap-8 text-center mb-8">
				<h2 className="flex flex-col items-center text-4xl font-semibold md:text-5xl">
					<span>Everything you are.</span>
					<span>In one place.</span>
				</h2>
				<div>
					<p className="text-lg font-medium text-balance md:text-xl">
						Bring your links, content, and favorite places together.
					</p>
					<p className="text-lg font-medium text-balance text-gray-bright md:text-xl">
						Share a page that feels like you.
					</p>
				</div>
			</div>

				<div className="grid w-full gap-4 md:grid-cols-2">
				{FEATURE_ITEMS.map(
					({ title, description, preview }, index) => {
						const Preview = featurePreviewMap[preview];

						return (
							<article
								key={title}
								className={`flex h-full min-h-0 flex-col gap-6 rounded-3xl bg-secondary/60 ${index === 0 ? "md:col-span-2" : ""} ${index === 1 ? "md:col-start-2 md:row-start-2" : ""} ${index === 2 ? "md:col-start-1 md:row-start-2 md:row-span-2" : ""} ${index === 3 ? "md:col-start-2 md:row-start-3" : ""}`}
							>
								<div className="flex flex-col gap-1 p-6">
									<h3 className="text-2xl font-medium tracking-tight">
										{title}
									</h3>
									<p className="text-base leading-relaxed text-gray-bright">
										{description}
									</p>
								</div>
								{preview === "rich-content" ||
								preview === "drag-drop" ||
								preview === "flexible-widget-sizes" ||
								preview === "perfect-the-frame" ? (
					<div
						className={`mx-6 mb-6 min-h-[18rem] flex-1 rounded-2xl ${preview === "rich-content" ? "min-h-[20rem] overflow-visible bg-background p-2 md:min-h-[40rem]" : `overflow-hidden bg-background ${preview === "flexible-widget-sizes" ? "md:min-h-[24rem]" : ""}`}`}
									>
										<Preview />
									</div>
								) : null}
							</article>
						);
					},
				)}
      </div>
      <p className="text-center text-base text-gray-bright md:text-xl">
				More features may be added over time.
			</p>
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
	return (
		<Player
			component={BreakpointToolbarComposition}
			durationInFrames={BREAKPOINT_PREVIEW_FRAMES}
			compositionWidth={640}
			compositionHeight={480}
			fps={60}
			autoPlay
			loop
			initiallyMuted
			controls={false}
			clickToPlay={false}
			acknowledgeRemotionLicense
			style={{ height: "100%", width: "100%", pointerEvents: "none" }}
		/>
	);
}

const BREAKPOINT_PREVIEW_FRAMES = 240;
const BREAKPOINT_PREVIEW_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const BREAKPOINT_BUTTON_SIZE = 104;
const BREAKPOINT_BUTTON_GAP = 8;
const BREAKPOINT_TABS_WIDTH =
	BREAKPOINT_BUTTON_SIZE * 2 + BREAKPOINT_BUTTON_GAP;

function BreakpointToolbarComposition() {
	const frame = useCurrentFrame() % BREAKPOINT_PREVIEW_FRAMES;
	const desktopToMobile = interpolate(
		frame,
		[48, 96],
		[0, 1],
		{
			easing: BREAKPOINT_PREVIEW_EASE,
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		},
	);
	const mobileToDesktop = interpolate(
		frame,
		[168, 216],
		[0, 1],
		{
			easing: BREAKPOINT_PREVIEW_EASE,
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		},
	);
	const activeProgress = frame < 168 ? desktopToMobile : 1 - mobileToDesktop;
	const pillX = interpolate(
		activeProgress,
		[0, 1],
		[0, BREAKPOINT_BUTTON_SIZE + BREAKPOINT_BUTTON_GAP],
	);
	const desktopColor = interpolateColors(
		activeProgress,
		[0, 1],
		["#ffffff", "#000000"],
	);
	const mobileColor = interpolateColors(
		activeProgress,
		[0, 1],
		["#000000", "#ffffff"],
	);
	const desktopOpacity = 1;
	const mobileOpacity = 1;

	return (
		<AbsoluteFill
			style={{
				alignItems: "center",
				backgroundColor: "transparent",
				justifyContent: "center",
			}}
		>
			<div
				className="flex items-center overflow-hidden rounded-full bg-background p-1.5 smooth-shadow-ring-sm shadow-black smooth-ring-neutral-300/30"
				style={{
					borderRadius: 40,
					display: "flex",
					gap: BREAKPOINT_BUTTON_GAP,
					padding: 8,
					position: "relative",
					width: BREAKPOINT_TABS_WIDTH + 16,
				}}
			>
					<div
						style={{
							backgroundColor: "#000000",
							borderRadius: 32,
							height: BREAKPOINT_BUTTON_SIZE,
							left: 8,
							position: "absolute",
							top: 8,
							translate: `${pillX}px 0px`,
							width: BREAKPOINT_BUTTON_SIZE,
						}}
					/>
					<div
						aria-hidden="true"
						style={{
							alignItems: "center",
							color: desktopColor,
							display: "flex",
							height: BREAKPOINT_BUTTON_SIZE,
							justifyContent: "center",
							opacity: desktopOpacity,
							position: "relative",
							width: BREAKPOINT_BUTTON_SIZE,
						}}
					>
							<HugeiconsIcon icon={Computer} strokeWidth={2} size={56} />
					</div>
					<div
						aria-hidden="true"
						style={{
							alignItems: "center",
							color: mobileColor,
							display: "flex",
							height: BREAKPOINT_BUTTON_SIZE,
							justifyContent: "center",
							opacity: mobileOpacity,
							position: "relative",
							width: BREAKPOINT_BUTTON_SIZE,
						}}
					>
							<HugeiconsIcon icon={Smartphone} strokeWidth={2} size={56} />
					</div>
			</div>
		</AbsoluteFill>
	);
}

function RichContentPreview() {
	const items = useMemo(createEverythingPreviewItems, []);

	return (
		<div className="relative size-full overflow-visible rounded-2xl bg-background">
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					maskImage:
						"radial-gradient(ellipse at center, #000 72%, transparent 100%)",
					WebkitMaskImage:
						"radial-gradient(ellipse at center, #000 72%, transparent 100%)",
				}}
			>
				<div
					className="absolute right-0 bottom-0 max-md:!inset-0 max-md:!h-full max-md:!w-full [--preview-row:49px] [--preview-gap:24px] md:[--preview-row:68px] md:[--preview-gap:36px]"
					style={
						{
							"--preview-small":
								"calc(var(--preview-row) * 2 + var(--preview-gap))",
							"--preview-wide":
								"calc(var(--preview-small) * 2 + var(--preview-gap))",
							"--preview-edge-inset": "0px",
							"--preview-item-gap": "var(--preview-gap)",
							boxSizing: "border-box",
							padding: "8px",
							width:
								"calc(var(--preview-small) * 5 + var(--preview-gap) * 4 - var(--preview-edge-inset) * 2 + 16px)",
							height:
								"calc(var(--preview-wide) + var(--preview-gap) + var(--preview-small) + 16px)",
							bottom: "0",
							right: "0",
						} as CSSProperties
					}
				>
					<div className="relative size-full">
						{items.map((item) => (
							<EverythingPreviewItem
								key={item.id}
								item={item}
								className={
									item.id === "everything-map"
										? "max-md:!bottom-auto max-md:!left-1/2 max-md:!right-auto max-md:!top-1/2 max-md:-translate-x-1/2 max-md:-translate-y-1/2"
										: "max-md:hidden"
								}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

const EVERYTHING_PREVIEW_POSITIONS = {
	"everything-media": {
		left: "calc(-1 * var(--preview-edge-inset))",
		top: "calc(var(--preview-wide) + var(--preview-item-gap))",
		width: "var(--preview-wide)",
		height: "var(--preview-small)",
		zIndex: 1,
	},
	"everything-media-portrait": {
		left:
			"calc(var(--preview-wide) - var(--preview-small) - var(--preview-edge-inset))",
		top: "0",
		width: "var(--preview-small)",
		height: "var(--preview-wide)",
		zIndex: 2,
	},
	"everything-github": {
		left:
			"calc(var(--preview-wide) - var(--preview-edge-inset) + var(--preview-item-gap))",
		top: "calc(var(--preview-small) + var(--preview-item-gap))",
		width: "var(--preview-small)",
		height: "var(--preview-wide)",
		zIndex: 3,
	},
	"everything-instagram": {
		left:
			"calc(var(--preview-wide) - var(--preview-edge-inset) + var(--preview-item-gap))",
		top: "0",
		width: "var(--preview-small)",
		height: "var(--preview-small)",
		zIndex: 4,
	},
	"everything-youtube": {
		left: "0",
		top: "calc(var(--preview-wide) - var(--preview-small))",
		width: "var(--preview-small)",
		height: "var(--preview-small)",
		zIndex: 2,
	},
	"everything-map": {
		right: "var(--preview-edge-inset)",
		top: "calc(var(--preview-small) + var(--preview-item-gap))",
		width: "var(--preview-wide)",
		height: "var(--preview-wide)",
		zIndex: 5,
	},
	"everything-text": {
		right: "var(--preview-edge-inset)",
		top: "calc(var(--preview-row) + var(--preview-item-gap))",
		width: "var(--preview-wide)",
		height: "var(--preview-row)",
		zIndex: 6,
	},
} as const satisfies Record<
	string,
	{
		top: string;
		left?: string;
		right?: string;
		height: string;
		width: string;
		zIndex: number;
	}
>;

const EVERYTHING_PREVIEW_ITEM_LAYOUTS: Record<PresetName, ItemLayout> = {
	halfBanner: { x: 0, y: 0, w: 2, h: 1 },
	squareSmall: { x: 0, y: 0, w: 1, h: 2 },
	landscape: { x: 0, y: 0, w: 2, h: 2 },
	squareLarge: { x: 0, y: 0, w: 2, h: 4 },
	portrait: { x: 0, y: 0, w: 1, h: 4 },
	fullBanner: { x: 0, y: 0, w: 4, h: 1 },
};

const EVERYTHING_PREVIEW_TIMESTAMP = "2026-01-01T00:00:00.000Z";

function createEverythingPreviewItem<T extends ItemType>({
	id,
	type,
	preset,
	data,
}: {
	id: string;
	type: T;
	preset: PresetName;
	data: GridItemByType<T>["data"];
}): GridItemByType<T> {
	const layout = EVERYTHING_PREVIEW_ITEM_LAYOUTS[preset];

	return {
		id,
		type,
		style: {},
		data,
		layouts: { wide: layout, compact: layout },
		createdAt: EVERYTHING_PREVIEW_TIMESTAMP,
		updatedAt: EVERYTHING_PREVIEW_TIMESTAMP,
		preset,
	} as GridItemByType<T>;
}

function createEverythingPreviewItems(): GridItem[] {
	const items: GridItem[] = [];
	const add = <T extends GridItem>(item: T) => {
		items.push(item);
		return item;
	};

	add(
		createEverythingPreviewItem({
			id: "everything-media",
			type: "media",
			preset: "landscape",
			data: {
				objectKey: "feature-preview-media",
				mimeType: "image/jpeg",
				mediaUrl: "https://cdn.grabbin.me/assets/features/4.jpg",
			},
		}),
	);

	add(
		createEverythingPreviewItem({
			id: "everything-map",
			type: "map",
			preset: "squareLarge",
			data: {
				latitude: 40.7128,
				longitude: -74.006,
				zoom: 10,
				caption: "New York",
			},
		}),
	);

	add(
		createEverythingPreviewItem({
			id: "everything-media-portrait",
			type: "media",
			preset: "portrait",
			data: {
				objectKey: "feature-preview-media-portrait",
				mimeType: "video/webm",
				mediaUrl: "https://cdn.grabbin.me/assets/features/3.webm",
			},
		}),
	);

	add(
		createEverythingPreviewItem({
			id: "everything-text",
			type: "text",
			preset: "halfBanner",
			data: { text: "Everything in one place." },
		}),
	);

	for (const link of [
		{
			id: "everything-github",
			preset: "portrait" as const,
			url: "https://github.com/example",
			metadata: { ...FEATURE_LINK_METADATA.github, title: "GitHub" },
		},
		{
			id: "everything-instagram",
			preset: "squareSmall" as const,
			url: "https://www.instagram.com/example",
			metadata: { ...FEATURE_LINK_METADATA.instagram, title: "Instagram" },
		},
		{
			id: "everything-youtube",
			preset: "squareSmall" as const,
			url: "https://www.youtube.com/@example",
			metadata: { ...FEATURE_LINK_METADATA.youtube, title: "YouTube" },
		},
	] as const) {
		add(
			createEverythingPreviewItem({
				id: link.id,
				type: "link",
				preset: link.preset,
				data: {
					url: link.url,
					metadata: link.metadata,
				},
			}),
		);
	}

	return items;
}

function EverythingPreviewItem({
	item,
	className,
}: {
	item: GridItem;
	className?: string;
}) {
	const position = EVERYTHING_PREVIEW_POSITIONS[item.id];
	const preset = item.preset;
	if (!position || !preset) return null;

	const capabilities = getItemCapabilities(item, {
		breakpoint: "wide",
		mode: "view",
	});

	return (
		<div className={`absolute ${className ?? ""}`} style={position}>
			<GridItemShell
				item={item}
				layout={EVERYTHING_PREVIEW_ITEM_LAYOUTS[preset]}
				capabilities={capabilities}
				onCommand={noopGridCommand}
			>
				<ItemRenderer
					item={item}
					breakpoint="wide"
					preset={preset}
					mode="view"
					onCommand={noopGridCommand}
				/>
			</GridItemShell>
		</div>
	);
}
