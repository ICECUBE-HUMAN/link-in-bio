import type { PageItemResponse, PageResponse } from "@sinabro/api";
import { MAX_ITEM_MEDIA_SIZE } from "@sinabro/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	redirect,
} from "@tanstack/react-router";
import { BotMessageSquareIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StackPerspective } from "reicon-react";
import { toast } from "sonner";
import { GridSection } from "@/components/grid/grid-section";
import { EditableParagraph } from "@/components/page/editable-paragraph";
import { MyPageButton } from "@/components/page/my-page-button";
import { PageImageEditor } from "@/components/page/page-image-editor";
import { PageManagementMenu } from "@/components/page/page-management-menu";
import { PageSettingsMenu } from "@/components/page/page-settings-menu";
import Toolbar from "@/components/page/toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { trackPageIdPageView } from "@/lib/analytics/simple-analytics";
import { uploadPageItemMedia } from "@/lib/api/item-media-api";
import {
	changePrimaryPage,
	getOwnedPages,
	getPageByHandleQueryOptions,
	MY_PAGE_QUERY_KEY,
	OWNED_PAGES_QUERY_KEY,
} from "@/lib/api/pages.functions";
import { getProfileImageUrl } from "@/lib/api/profile-image-api";
import { getSessionQueryOptions } from "@/lib/api/session.functions";
import { getPublicViewsQueryOptions } from "@/lib/api/visitors.functions";
import { getDemoPage } from "@/lib/demo/demo-page.functions";
import { useGridEditorStore } from "@/lib/grid/editor-store";
import type { Breakpoint } from "@/lib/grid/types";
import { getPageLayoutClasses } from "@/lib/page/page-layout";
import { getPageMode } from "@/lib/page/page-mode";
import { useBreakpointTransition } from "@/lib/page/use-breakpoint-transition";
import { useLinkMetadataEnrichment } from "@/lib/page/use-link-metadata-enrichment";
import { usePageAutoSave } from "@/lib/page/use-page-auto-save";
import { createProfilePageJsonLd } from "@/lib/seo/json-ld";
import {
	createSeo,
	DEFAULT_APP_LOGO,
	DEFAULT_SEO_DESCRIPTION,
	DEFAULT_SITE_NAME,
	truncateSeoText,
} from "@/lib/seo/metadata";

type HandleLoaderData = {
	page: PageResponse;
	items: PageItemResponse[];
	isCurrentUserPage: boolean;
	isDemo: boolean;
	visitorsEnabled: boolean;
};

type PrimaryActionState = "idle" | "setting" | "success" | "fading" | "hidden";

const REEL_SPINS = 3;
const REEL_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const REEL_SEQUENCE = Array.from(
	{ length: (REEL_SPINS + 1) * REEL_DIGITS.length },
	(_, index) => REEL_DIGITS[index % REEL_DIGITS.length],
);

function SpinningCounter({ value }: { value: number }) {
	const digitString = String(value);
	const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);

	useEffect(() => {
		for (const strip of stripRefs.current) {
			if (!strip) continue;
			strip.style.transition = "none";
			strip.style.transform = "translateY(0)";
			void strip.offsetHeight;
		}

		const frame = requestAnimationFrame(() => {
			for (const [index, strip] of stripRefs.current.entries()) {
				if (!strip) continue;

				const styles = getComputedStyle(strip);
				const cellSize =
					Number.parseFloat(styles.getPropertyValue("--reel-cell")) || 30;
				const stagger =
					Number.parseFloat(styles.getPropertyValue("--reel-stagger")) || 90;
				const digit = Number(digitString[index] ?? 0);

				strip.style.transition = `transform var(--reel-dur) var(--reel-ease) ${index * stagger}ms`;
				strip.style.transform = `translateY(-${(REEL_SPINS * 10 + digit) * cellSize}px)`;
			}
		});

		return () => cancelAnimationFrame(frame);
	}, [digitString]);

	return (
		<span className="t-reel" aria-hidden="true">
			{[...digitString].map((_, index) => (
				<span className="t-reel-col" key={`reel-${index.toString(36)}`}>
					<span
						className="t-reel-strip"
						ref={(element) => {
							stripRefs.current[index] = element;
						}}
					>
						{REEL_SEQUENCE.map((digit, sequenceIndex) => (
							<span
								className="t-reel-digit"
								key={`${digit}-${Math.floor(sequenceIndex / REEL_DIGITS.length)}`}
							>
								{digit}
							</span>
						))}
					</span>
				</span>
			))}
		</span>
	);
}

function getFaviconUrl(imageUrl: string) {
	return `/api/favicon?v=3&image=${encodeURIComponent(imageUrl)}`;
}

function getPublicPageTitle(page: PageResponse) {
	return page.name?.trim() || `@${page.handle}`;
}

function getPublicPageDescription(page: PageResponse) {
	const title = getPublicPageTitle(page);
	const bio = page.bio?.trim();

	return truncateSeoText(
		bio || `${title} on ${DEFAULT_SITE_NAME}: links, media, and more.`,
	);
}

export const Route = createFileRoute("/$handle")({
	loader: async ({ context, params }): Promise<HandleLoaderData> => {
		if (params.handle.trim().toLowerCase() === "demo") {
			const demoPage = await getDemoPage();
			return {
				page: demoPage.page,
				items: demoPage.items,
				isCurrentUserPage: true,
				isDemo: true,
				visitorsEnabled: false,
			};
		}

		const [{ data: session }, result] = await Promise.all([
			context.queryClient.ensureQueryData(getSessionQueryOptions()),
			context.queryClient.ensureQueryData(
				getPageByHandleQueryOptions(params.handle),
			),
		]);

		if (session?.user && !session.user.primaryPageId) {
			throw redirect({
				to: "/new",
			});
		}

		if (!result) {
			throw notFound({
				routeId: Route.id,
			});
		}

		return {
			page: result.page,
			items: result.items,
			isCurrentUserPage: session?.user.id === result.page.userId,
			isDemo: false,
			visitorsEnabled: result.visitorsEnabled === true,
		};
	},
	head: ({ loaderData }) => {
		const title = loaderData
			? getPublicPageTitle(loaderData.page)
			: DEFAULT_SITE_NAME;
		const description = loaderData
			? getPublicPageDescription(loaderData.page)
			: DEFAULT_SEO_DESCRIPTION;
		const image = loaderData
			? (getProfileImageUrl(loaderData.page.image) ?? DEFAULT_APP_LOGO)
			: DEFAULT_APP_LOGO;
		const favicon = getFaviconUrl(image);
		const canonicalPath = loaderData
			? `/${encodeURIComponent(loaderData.page.handle)}`
			: undefined;
		const seo = createSeo({
			title,
			description,
			canonicalPath,
			image,
			imageAlt: `${title} profile image`,
			noIndex: false,
			jsonLd: loaderData
				? createProfilePageJsonLd({
						title,
						handle: loaderData.page.handle,
						description,
						path: canonicalPath ?? "/",
						image,
					})
				: undefined,
		});

		return {
			...seo,
			links: [
				...seo.links,
				{
					rel: "icon",
					href: favicon,
					"data-page-favicon": "true",
				},
			],
		};
	},
	component: HandlePage,
});

function HandlePage() {
	const loaderData = Route.useLoaderData();
	const [page, setPage] = useState(loaderData.page);

	useEffect(() => {
		setPage(loaderData.page);
	}, [loaderData.page]);
	const displayedPage =
		page.handle === loaderData.page.handle ? page : loaderData.page;

	return (
		<HandlePageContent
			key={displayedPage.handle}
			loaderData={{ ...loaderData, page: displayedPage }}
			onPageChange={(nextPage) => {
				setPage(nextPage);
				if (!loaderData.isDemo) {
					window.history.replaceState(
						window.history.state,
						"",
						`/${encodeURIComponent(nextPage.handle)}${window.location.search}${window.location.hash}`,
					);
				}
			}}
		/>
	);
}

function HandlePageContent({
	loaderData,
	onPageChange,
}: {
	loaderData: HandleLoaderData;
	onPageChange: (page: PageResponse) => void;
}) {
	const { page } = loaderData;
	const queryClient = useQueryClient();
	const trackedPageIdRef = useRef<string | null>(null);
	const [timezone, setTimezone] = useState<string | null>(null);

	useEffect(() => {
		if (loaderData.isDemo || trackedPageIdRef.current === page.id) return;
		trackedPageIdRef.current = page.id;
		return trackPageIdPageView(page.id);
	}, [loaderData.isDemo, page.id]);

	useEffect(() => {
		setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
	}, []);

	const canShowViews = !loaderData.isDemo && loaderData.visitorsEnabled;
	const publicViewsQuery = useQuery({
		...getPublicViewsQueryOptions(page.id, page.handle, timezone ?? "UTC"),
		enabled: timezone !== null && canShowViews,
	});
	const showPublicViews =
		canShowViews &&
		!publicViewsQuery.isError &&
		publicViewsQuery.isSuccess &&
		publicViewsQuery.data.todayViews !== null &&
		publicViewsQuery.data.yesterdayViews !== null;
	const showPublicViewsSkeleton =
		canShowViews && !publicViewsQuery.isError && !publicViewsQuery.isSuccess;

	const { data: sessionResult } = useQuery({
		...getSessionQueryOptions(),
		enabled: !loaderData.isDemo,
	});
	const isCurrentUserPage = sessionResult
		? sessionResult.data?.user.id === page.userId
		: loaderData.isCurrentUserPage;
	const isSignedIn = Boolean(sessionResult?.data?.user);
	const mode = getPageMode(isCurrentUserPage);
	const { data: ownedPagesResult } = useQuery({
		queryKey: OWNED_PAGES_QUERY_KEY,
		queryFn: getOwnedPages,
		enabled: isCurrentUserPage && !loaderData.isDemo,
	});
	const ownedPage = ownedPagesResult?.pages.find(
		(candidate) => candidate.handle === page.handle,
	);
	const [primaryActionState, setPrimaryActionState] =
		useState<PrimaryActionState>("idle");
	const primaryActionTimerRef = useRef<number | null>(null);
	const primaryActionPageHandleRef = useRef(page.handle);

	useEffect(() => {
		if (primaryActionPageHandleRef.current !== page.handle) {
			primaryActionPageHandleRef.current = page.handle;
			setPrimaryActionState("idle");
		}
		if (primaryActionTimerRef.current !== null) {
			window.clearTimeout(primaryActionTimerRef.current);
			primaryActionTimerRef.current = null;
		}

		return () => {
			if (primaryActionTimerRef.current !== null) {
				window.clearTimeout(primaryActionTimerRef.current);
				primaryActionTimerRef.current = null;
			}
		};
	}, [page.handle]);

	const showPrimaryAction =
		isCurrentUserPage &&
		!loaderData.isDemo &&
		ownedPage !== undefined &&
		primaryActionState !== "hidden" &&
		(!ownedPage.isPrimary ||
			primaryActionState === "success" ||
			primaryActionState === "fading");

	async function handleSetPrimaryPage() {
		if (!ownedPage || ownedPage.isPrimary || primaryActionState !== "idle")
			return;

		setPrimaryActionState("setting");
		try {
			await changePrimaryPage({ data: { handle: page.handle } });
		} catch (caught) {
			setPrimaryActionState("idle");
			toast.error(
				caught instanceof Error
					? caught.message
					: "Could not set this as your primary page.",
			);
			return;
		}

		setPrimaryActionState("success");
		void Promise.all([
			queryClient.invalidateQueries({ queryKey: OWNED_PAGES_QUERY_KEY }),
			queryClient.invalidateQueries({ queryKey: MY_PAGE_QUERY_KEY }),
		]);
		primaryActionTimerRef.current = window.setTimeout(() => {
			setPrimaryActionState("fading");
			primaryActionTimerRef.current = window.setTimeout(() => {
				setPrimaryActionState("hidden");
				primaryActionTimerRef.current = null;
			}, 500);
		}, 1800);
	}

	const readOnly =
		isCurrentUserPage &&
		!loaderData.isDemo &&
		(ownedPagesResult === undefined ||
			!ownedPage ||
			(!ownedPagesResult.hasAccess && !ownedPage.isPrimary));
	const editorMode = readOnly ? "view" : mode;
	const [isAsideShown, setIsAsideShown] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [previewBreakpoint, setPreviewBreakpoint] =
		useState<Breakpoint>("wide");
	const pageScrollRef = useRef<HTMLElement | null>(null);
	const shouldReduceMotion = useReducedMotion();
	const { commitFields, draft, status, updateField, updateFields } =
		usePageAutoSave({
			page,
			handle: page.handle,
			enabled: mode === "edit",
			persist: !loaderData.isDemo,
			readOnly,
		});
	const {
		items,
		autoFocusItemId,
		clearAutoFocusItem,
		status: gridStatus,
		dispatchCommand,
		flushPendingChanges,
		replaceItemFromServer,
		addPendingMedia,
		updateMediaUpload,
		removeMediaItem,
	} = useGridEditorStore({
		initialItems: loaderData.items,
		handle: page.handle,
		breakpoint: previewBreakpoint,
		enabled: editorMode === "edit",
		persistItems: !loaderData.isDemo && !readOnly,
	});
	const { enrichingItemIds, enrichLinkItem } = useLinkMetadataEnrichment({
		handle: page.handle,
		flushPendingChanges,
		replaceItemFromServer,
		enabled: !loaderData.isDemo,
	});
	const {
		breakpointTransition,
		changeBreakpoint: handlePreviewBreakpointChange,
	} = useBreakpointTransition({
		previewBreakpoint,
		setPreviewBreakpoint,
		shouldReduceMotion,
		flushPendingChanges,
	});

	useEffect(() => {
		document.title = draft.name?.trim() || page.handle;

		const faviconHref = getFaviconUrl(
			getProfileImageUrl(draft.image) ?? DEFAULT_APP_LOGO,
		);
		const iconLinks = Array.from(
			document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
		);
		const originalIconAttributes = iconLinks.map((link) => ({
			href: link.getAttribute("href"),
			type: link.getAttribute("type"),
		}));
		const favicon =
			document.head.querySelector<HTMLLinkElement>(
				'link[data-page-favicon="true"]',
			) ?? document.createElement("link");
		const isNewFavicon = !favicon.isConnected;

		favicon.rel = "icon";
		favicon.dataset.pageFavicon = "true";
		favicon.href = faviconHref;
		if (isNewFavicon) {
			document.head.appendChild(favicon);
		}

		for (const link of iconLinks) {
			link.href = faviconHref;
			link.removeAttribute("type");
		}

		return () => {
			iconLinks.forEach((link, index) => {
				const original = originalIconAttributes[index];
				if (original?.href === null) link.removeAttribute("href");
				else if (original?.href) link.href = original.href;
				if (original?.type === null) link.removeAttribute("type");
				else if (original?.type) link.type = original.type;
			});
			if (isNewFavicon) favicon.remove();
		};
	}, [draft.image, draft.name, page.handle]);

	useEffect(() => {
		const frame = requestAnimationFrame(() => setIsAsideShown(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	useLayoutEffect(() => {
		if (page.handle.length === 0) return;
		const scrollContainer = pageScrollRef.current;
		if (!scrollContainer) return;

		scrollContainer.scrollTop = 0;
		scrollContainer.scrollLeft = 0;
		const frame = window.requestAnimationFrame(() => {
			scrollContainer.scrollTo({ top: 0, left: 0, behavior: "auto" });
		});

		return () => window.cancelAnimationFrame(frame);
	}, [page.handle]);

	const layoutClasses = getPageLayoutClasses(previewBreakpoint);
	const isCompactPreview = previewBreakpoint === "compact";
	const isFrameResizing = breakpointTransition === "frame";
	const showCompactCanvas = isCompactPreview || isFrameResizing;
	const frameLayoutTransition = shouldReduceMotion
		? { duration: 0 }
		: {
				duration: 0.35,
				ease: [0.22, 1, 0.36, 1] as const,
			};

	return (
		<main
			ref={pageScrollRef}
			className={`page-scroll-container relative box-border min-h-dvh w-full ${isCompactPreview ? "overscroll-y-none" : ""} no-scrollbar ${isCompactPreview ? "overflow-y-hidden" : "overflow-y-auto"} ${showCompactCanvas ? "bg-secondary" : "bg-background"} min-[90rem]:flex min-[90rem]:h-dvh ${isCompactPreview ? "min-[90rem]:items-center" : "min-[90rem]:items-start"} min-[90rem]:justify-center`}
		>
			<motion.div
				layout
				transition={{ layout: frameLayoutTransition }}
				className={`t-breakpoint-frame ${isCompactPreview ? "overscroll-y-none" : ""} flex w-full flex-col items-center gap-8 ${isCompactPreview ? "min-[90rem]:h-[calc(100dvh-14rem)] min-[90rem]:min-h-0 min-[90rem]:overflow-y-auto no-scrollbar" : "min-[90rem]:h-auto min-[90rem]:min-h-dvh overflow-visible"} min-[90rem]:max-w-none ${layoutClasses.shell} ${showCompactCanvas ? "bg-background min-[90rem]:rounded-[3.5rem] min-[90rem]:py-4 shadow-float-lg" : "min-[90rem]:bg-transparent min-[90rem]:rounded-none"} ${isCompactPreview ? "min-[90rem]:w-120 min-[90rem]:max-w-[calc(100vw-2rem)] " : ""}`}
			>
				<div
					className={`flex min-w-0 w-full max-w-md flex-col ${layoutClasses.profile}`}
				>
					<aside
						id="page-profile"
						data-breakpoint-transition={breakpointTransition}
						className={`t-breakpoint-crossfade t-stagger flex min-h-0 w-full flex-1 flex-col gap-8 p-6 px-12 pt-12 ${layoutClasses.profileAside} ${isAsideShown ? "is-shown" : ""}`}
					>
						<div className="t-stagger-line t-stagger-line--1">
							<PageImageEditor
								initialImage={draft.image}
								initialImageUpdatedAt={page.updatedAt}
								initialImageSource={draft.imageSource}
								initialImageCrop={draft.imageCrop}
								handle={page.handle}
								mode={editorMode}
								breakpoint={previewBreakpoint}
								onImageChange={updateFields}
								onImageCommit={commitFields}
								localOnly={loaderData.isDemo}
							/>
						</div>
						<div
							className={`flex min-w-0 flex-col gap-2 ${layoutClasses.profileDetails}`}
						>
							<EditableParagraph
								value={draft.name}
								placeholder="Name"
								mode={editorMode}
								onChange={(name) => updateField("name", name)}
								rows={1}
								spellCheck={false}
								className={`t-stagger-line t-stagger-line--2 text-3xl font-bold leading-tight tracking-tight ${layoutClasses.name}`}
							/>
							<EditableParagraph
								value={draft.bio}
								placeholder="Tell about you"
								mode={editorMode}
								onChange={(bio) => updateField("bio", bio)}
								rows={2}
								spellCheck={false}
								className={`t-stagger-line t-stagger-line--3 px-0.5 text-base leading-6 text-primary/80 ${layoutClasses.bio}`}
							/>
						</div>
						{showPrimaryAction ? (
							<div
								className={`mt-20 w-fit transition-opacity duration-500 ease-out motion-reduce:transition-none z-100 ${primaryActionState === "fading" ? "opacity-0" : "opacity-100"}`}
							>
								<Button
									type="button"
									variant="secondary"
									className="t-copy-button w-fit rounded-lg text-muted-foreground"
									data-state={
										primaryActionState === "success" ||
										primaryActionState === "fading"
											? "copied"
											: "idle"
									}
									disabled={primaryActionState === "setting"}
									aria-busy={primaryActionState === "setting"}
									onClick={() => void handleSetPrimaryPage()}
								>
									<span className="t-copy-feedback" aria-live="polite">
										<span className="t-copy-labels">
											<span className="t-copy-label t-copy-label-idle inline-flex items-center gap-1.5">
												set as primary page
											</span>
											<span className="t-copy-label t-copy-label-copied">
												Now it's your primary page!
											</span>
										</span>
									</span>
								</Button>
							</div>
						) : null}
					</aside>
				</div>

				<section
					id="page-grid"
					data-breakpoint-transition={breakpointTransition}
					className={`t-breakpoint-crossfade grid-content-scroll-shell min-h-[calc(100dvh-3rem)] w-full overflow-visible p-0 pt-0 sm:max-w-md no-scrollbar min-[90rem]:px-0 min-[90rem]:pb-24 ${layoutClasses.content}`}
				>
					<div className="flex flex-col gap-4">
						<GridSection
							items={items}
							breakpoint={previewBreakpoint}
							mode={mode}
							enrichingItemIds={enrichingItemIds}
							autoFocusItemId={autoFocusItemId}
							onAutoFocus={clearAutoFocusItem}
							onCommand={dispatchCommand}
						/>
					</div>
				</section>
			</motion.div>

			{!loaderData.isDemo ? (
				<aside
					className={`flex flex-col items-center gap-2 py-24 pt-0 z-10 min-[90rem]:flex-row min-[90rem]:py-0 ${layoutClasses.controls}`}
					aria-label="Page controls"
				>
					{readOnly && ownedPage && !ownedPage.isPrimary ? (
						<div className="text-xs text-muted-foreground">
							Non-primary pages are read-only and will be deleted soon.
						</div>
					) : null}
					<div
						className={
							isSignedIn
								? "flex flex-col items-center gap-2 min-[90rem]:flex-row min-[90rem]:gap-0"
								: "flex items-center gap-0"
						}
					>
						<div
							className={
								isSignedIn
									? "order-2 flex flex-row items-center justify-center gap-1 min-[90rem]:order-none min-[90rem]:contents"
									: "contents"
							}
						>
							{isCurrentUserPage ? (
								<Tooltip disabled={isSettingsOpen}>
									<TooltipTrigger render={<span className="inline-flex" />}>
										<PageSettingsMenu
											page={page}
											onChanged={onPageChange}
											onOpenChange={setIsSettingsOpen}
											localOnly={loaderData.isDemo}
											readOnly={readOnly}
										/>
									</TooltipTrigger>
									<TooltipContent>Settings</TooltipContent>
								</Tooltip>
							) : !isSignedIn ? (
								<Button
									render={
										<Link to="/log-in" search={{ redirect: `/${page.handle}` }}>
											Log in
										</Link>
									}
									variant="ghost"
									nativeButton={false}
									size="sm"
									className="rounded-md text-muted-foreground/80"
								/>
							) : null}
							{/*<Tooltip>
							<TooltipTrigger
								render={
									<Button
										render={<Link to="/explore" />}
										variant="ghost"
										nativeButton={false}
										size="icon-sm"
										aria-label="Explore"
										className="text-muted-foreground/80 rounded-md"
									/>
								}
							>
								<StackPerspective weight="Filled" />
							</TooltipTrigger>
							<TooltipContent>Explore</TooltipContent>
						</Tooltip>*/}
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											variant="ghost"
											size="sm"
											aria-label="Feedback"
											className="text-muted-foreground/80 rounded-md"
											render={
												<a
													href="https://discord.gg/U4NNF9hMms"
													target="_blank"
													rel="noreferrer"
												>
													Community
												</a>
											}
										/>
									}
								/>
								<TooltipContent>Send us feedback</TooltipContent>
							</Tooltip>
							{showPublicViews ? (
								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												variant="ghost"
												size="sm"
												className="rounded-md text-sm text-muted-foreground/80"
												aria-label={`${publicViewsQuery.data.todayViews} views today`}
											/>
										}
									>
										<SpinningCounter
											value={publicViewsQuery.data.todayViews ?? 0}
										/>
										<span className="ml-1">views today</span>
									</TooltipTrigger>
									<TooltipContent>
										{`${publicViewsQuery.data?.yesterdayViews ?? "—"} views yesterday`}
									</TooltipContent>
								</Tooltip>
							) : showPublicViewsSkeleton ? (
								<Skeleton className="h-8 w-24 rounded-md" />
							) : null}
						</div>
						<div
							className={
								isSignedIn
									? "order-1 flex flex-row items-center justify-center gap-1 min-[90rem]:order-none min-[90rem]:contents"
									: "contents"
							}
						>
							{isSignedIn ? (
								isCurrentUserPage ? (
									<PageManagementMenu triggerPage={{ ...page, ...draft }} />
								) : (
									<MyPageButton />
								)
							) : null}
						</div>
					</div>
				</aside>
			) : null}

			{editorMode === "edit" ? (
				<Toolbar
					page={page}
					readOnly={readOnly}
					breakpoint={previewBreakpoint}
					isSaving={status === "saving" || gridStatus === "saving"}
					onItemAdd={(itemType, url) => {
						const newItem = dispatchCommand({
							type: "add-item",
							itemType,
							url,
						});
						if (itemType === "link" && newItem?.type === "link" && url) {
							void enrichLinkItem(newItem.id, url);
						}
					}}
					onMediaSelect={async (file) => {
						if (file.size > MAX_ITEM_MEDIA_SIZE) return;
						const previewUrl = URL.createObjectURL(file);
						const itemId = addPendingMedia({
							mimeType: file.type,
							previewUrl,
						});
						if (!itemId) {
							URL.revokeObjectURL(previewUrl);
							return;
						}
						if (loaderData.isDemo) return;
						try {
							const uploaded = await uploadPageItemMedia(page.handle, file);
							updateMediaUpload({
								itemId,
								objectKey: uploaded.objectKey,
								mimeType: uploaded.mimeType,
							});
						} catch (error) {
							removeMediaItem(itemId);
							URL.revokeObjectURL(previewUrl);
							toast.error(
								error instanceof Error ? error.message : "Media upload failed.",
							);
						}
					}}
					onBreakpointChange={(nextBreakpoint) => {
						void handlePreviewBreakpointChange(nextBreakpoint);
					}}
				/>
			) : null}
		</main>
	);
}
