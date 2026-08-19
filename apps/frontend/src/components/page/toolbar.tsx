import {
	ChevronLeftIcon,
	Computer,
	Smartphone,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { OwnedPageSummary, PageResponse } from "@sinabro/api";
import {
	ITEM_MEDIA_ACCEPT,
	MAX_ITEM_MEDIA_SIZE,
	normalizeLinkUrl,
} from "@sinabro/api";
import { PRO_PAGE_LIMIT } from "@sinabro/plan";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheckIcon, PlusIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ChangeEvent, useRef, useState } from "react";
import {
	Document2,
	GalleryCircle,
	Globe,
	LinkCircle3,
	Loader,
	Send,
	TextCircle,
	Widget4,
} from "reicon-react";
import { toast } from "sonner";
import { CreatePageFlow } from "@/components/page/create-page-flow";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	getOwnedPages,
	MY_PAGE_QUERY_KEY,
	OWNED_PAGES_QUERY_KEY,
} from "@/lib/api/pages.functions";
import { getProfileImageUrl } from "@/lib/api/profile-image-api";
import type { Breakpoint, ItemType } from "@/lib/grid/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "../ui/input-group";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ShareDialog } from "./share-dialog";

type ToolbarProps = {
	breakpoint: Breakpoint;
	isSaving: boolean;
	page: PageResponse;
	onBreakpointChange: (breakpoint: Breakpoint) => void;
	onItemAdd: (itemType: ItemType, url?: string) => void;
	onMediaSelect: (file: File) => void | Promise<void>;
	readOnly?: boolean;
	showPagePicker?: boolean;
};

function normalizeLinkInput(value: string) {
	try {
		return normalizeLinkUrl(value);
	} catch {
		return null;
	}
}

export default function Toolbar({
	breakpoint,
	isSaving,
	page,
	onBreakpointChange,
	onItemAdd,
	onMediaSelect,
	readOnly = false,
	showPagePicker = true,
}: ToolbarProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const mediaInputRef = useRef<HTMLInputElement>(null);
	const [view, setView] = useState<"toolbar" | "link" | "widget">("toolbar");
	const [isPageListOpen, setIsPageListOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const {
		data: ownedPagesResult,
		isPending,
		isError,
	} = useQuery({
		queryKey: OWNED_PAGES_QUERY_KEY,
		queryFn: getOwnedPages,
		enabled: showPagePicker,
	});
	const canAddLink = normalizeLinkInput(linkUrl) !== null;
	const shouldReduceMotion = useReducedMotion();
	const pages = ownedPagesResult?.pages ?? [];
	const sortedPages = [...pages].sort(
		(a, b) => Number(b.isPrimary) - Number(a.isPrimary),
	);
	const layoutDependency = [
		view,
		isPageListOpen,
		isSaving,
		showPagePicker,
		isError,
		isPending && !ownedPagesResult,
		pages.length,
	].join(":");

	const viewTransition = shouldReduceMotion
		? { duration: 0 }
		: {
				duration: 0.2,
				ease: [0.23, 1, 0.32, 1] as const,
			};

	function submitLink(value: string) {
		if (readOnly) return false;
		const normalizedUrl = normalizeLinkInput(value);
		if (!normalizedUrl) return false;
		onItemAdd("link", normalizedUrl);
		setLinkUrl("");
		setView("toolbar");
		return true;
	}

	async function refreshOwnedPages() {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: OWNED_PAGES_QUERY_KEY }),
			queryClient.invalidateQueries({ queryKey: MY_PAGE_QUERY_KEY }),
		]);
	}

	async function handleCreated(handle: string) {
		setIsCreateOpen(false);
		setIsPageListOpen(false);
		await refreshOwnedPages();
		await navigate({ to: "/$handle", params: { handle } });
	}

	function handleMediaChange(event: ChangeEvent<HTMLInputElement>) {
		if (readOnly) return;
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		if (file.size > MAX_ITEM_MEDIA_SIZE) {
			toast.error("Media files must be 3 MB or smaller.");
			return;
		}
		if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
			toast.error("Please choose an image or video file.");
			return;
		}
		void onMediaSelect(file);
	}

	return (
		<div
			id="page-toolbar"
			className="fixed bottom-8 z-100 flex w-full items-center justify-center"
		>
			<input
				ref={mediaInputRef}
				type="file"
				accept={ITEM_MEDIA_ACCEPT}
				hidden
				onChange={handleMediaChange}
			/>
			<motion.div
				layout
				layoutDependency={layoutDependency}
				transition={{ layout: viewTransition }}
				className="t-toolbar-surface flex flex-col overflow-hidden rounded-xl bg-background p-1.5 smooth-shadow-ring shadow-black smooth-ring-neutral-300/30 will-change-transform"
				data-page-list-open={isPageListOpen}
			>
				{showPagePicker ? (
					<div className="t-acc" data-open={isPageListOpen}>
						<div className="t-acc-panel">
							<div className="t-acc-panel-inner">
								<div className="flex w-full min-w-0 max-w-[calc(100vw-2rem)] flex-row items-center gap-1 overflow-x-auto p-1 no-scrollbar">
									{isError ? (
										<p
											className="px-3 py-4 text-xs text-destructive"
											role="alert"
										>
											Could not load your pages.
										</p>
									) : isPending && !ownedPagesResult ? (
										<PageListSkeleton />
									) : (
										<>
											{sortedPages.map((ownedPage) => (
												<PageListItem
													key={ownedPage.id}
													page={ownedPage}
													onSelect={() => setIsPageListOpen(false)}
												/>
											))}
											<Dialog
												open={isCreateOpen}
												onOpenChange={setIsCreateOpen}
											>
												<Button
													type="button"
													variant="ghost"
													size="icon-lg"
													aria-label="Create page"
													disabled={
														ownedPagesResult?.hasAccess !== true ||
														pages.length >= PRO_PAGE_LIMIT
													}
													onClick={() => setIsCreateOpen(true)}
													className="flex-none rounded-lg text-primary hover:text-primary"
												>
													<PlusIcon />
												</Button>
												<DialogContent className="gap-0 overflow-hidden p-6 sm:max-w-md">
													<DialogTitle className="sr-only">
														Create a new page
													</DialogTitle>
													<DialogDescription className="sr-only">
														Choose a handle and role for your new page.
													</DialogDescription>
													<CreatePageFlow
														onCreated={(handle) => void handleCreated(handle)}
													/>
												</DialogContent>
											</Dialog>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				) : null}
				<AnimatePresence initial={false} mode="popLayout">
					{view === "link" ? (
						<motion.div
							key="link-view"
							initial={{ opacity: 0, transform: "translateX(8px)" }}
							animate={{ opacity: 1, transform: "translateX(0px)" }}
							exit={{ opacity: 0, transform: "translateX(-8px)" }}
							transition={viewTransition}
							className="flex items-center gap-1"
						>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label="Back to toolbar"
								className="rounded-full text-primary hover:text-primary"
								onClick={() => setView("toolbar")}
							>
								<HugeiconsIcon
									icon={ChevronLeftIcon}
									strokeWidth={2}
									className="size-5"
								/>
							</Button>
							<InputGroup className="h-9 w-64 rounded-lg bg-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0">
								<InputGroupInput
									placeholder="Paste a link"
									aria-label="Link URL"
									value={linkUrl}
									onChange={(event) => setLinkUrl(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											submitLink(linkUrl);
										}
									}}
									onPaste={(event) => {
										const pasted = event.clipboardData.getData("text");
										if (submitLink(pasted)) event.preventDefault();
									}}
									autoFocus
									autoComplete="off"
									disabled={readOnly}
								/>
								<InputGroupAddon align="inline-end" className="pr-1.5">
									<InputGroupButton
										type="button"
										size="icon-sm"
										aria-label="Add link"
										className="bg-brand"
										disabled={!canAddLink}
										onClick={() => {
											submitLink(linkUrl);
										}}
									>
										<Send weight="Filled" className="size-4 text-white" />
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
						</motion.div>
					) : view === "widget" ? (
						<motion.div
							key="widget-view"
							initial={{ opacity: 0, transform: "translateX(8px)" }}
							animate={{ opacity: 1, transform: "translateX(0px)" }}
							exit={{ opacity: 0, transform: "translateX(-8px)" }}
							transition={viewTransition}
							className="flex items-center gap-2 pr-3"
						>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label="Back to toolbar"
								className="rounded-full text-primary hover:text-primary"
								onClick={() => setView("toolbar")}
							>
								<HugeiconsIcon
									icon={ChevronLeftIcon}
									strokeWidth={2}
									className="size-5"
								/>
							</Button>
							<span className="px-2 text-sm text-muted-foreground">
								more widgets will be added
							</span>
						</motion.div>
					) : (
						<motion.div
							key="toolbar-content"
							initial={{ opacity: 0, transform: "translateX(-8px)" }}
							animate={{ opacity: 1, transform: "translateX(0px)" }}
							exit={{ opacity: 0, transform: "translateX(8px)" }}
							transition={viewTransition}
							className="flex items-center gap-1"
						>
							<div id="toolbar-content" className="flex items-center gap-1">
								{showPagePicker ? (
									<ToolbarButton
										label={isPageListOpen ? "Close pages" : "Switch page"}
										ariaExpanded={isPageListOpen}
										onClick={() => setIsPageListOpen((open) => !open)}
										className="size-10"
									>
										<Avatar size="default" className="size-8">
											<AvatarImage
												src={getProfileImageUrl(page.image) ?? undefined}
												alt=""
											/>
											<AvatarFallback />
										</Avatar>
									</ToolbarButton>
								) : null}
								<Separator
									orientation="vertical"
									className="my-3 hidden rounded-2xl bg-muted-foreground/20 data-vertical:w-0.5 min-[90rem]:flex"
								/>
								<div className="hidden items-center min-[90rem]:flex">
									{isSaving ? (
										<Button
											variant="brand"
											size="default"
											className="surface-line w-28 px-8"
											disabled
										>
											<Loader className="size-4 animate-spin text-primary" />
											Saving
										</Button>
									) : (
										<ShareDialog page={page} />
									)}
								</div>
								<div className="flex items-center gap-0 text-muted-foreground">
									<ToolbarButton
										disabled={readOnly}
										label="Link"
										onClick={() => {
											setIsPageListOpen(false);
											setView("link");
										}}
									>
										<LinkCircle3 weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton
										label="Section Title"
										disabled={readOnly}
										onClick={() => onItemAdd("section")}
									>
										<Document2 weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton
										disabled={readOnly}
										label="Text"
										onClick={() => onItemAdd("text")}
									>
										<TextCircle weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton
										label="Gallery"
										disabled={readOnly}
										onClick={() => mediaInputRef.current?.click()}
									>
										<GalleryCircle weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton
										disabled={readOnly}
										label="Map"
										onClick={() => onItemAdd("map")}
									>
										<Globe weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton
										label="Widget"
										disabled={readOnly}
										onClick={() => {
											setIsPageListOpen(false);
											setView("widget");
										}}
									>
										<Widget4 weight="Outline" className="size-5" />
									</ToolbarButton>
								</div>
								<Separator
									orientation="vertical"
									className="my-3 hidden rounded-2xl bg-muted-foreground/20 data-vertical:w-0.5 min-[90rem]:flex"
								/>
								<aside className="hidden space-x-0 text-muted-foreground min-[90rem]:flex">
									<ToolbarButton
										label="Wide"
										onClick={() => onBreakpointChange("wide")}
										className={cn(
											breakpoint === "wide" &&
												"bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
										)}
									>
										<HugeiconsIcon
											icon={Computer}
											strokeWidth={2}
											className="size-5"
										/>
									</ToolbarButton>
									<ToolbarButton
										label="Compact"
										onClick={() => onBreakpointChange("compact")}
										className={cn(
											breakpoint === "compact" &&
												"bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
										)}
									>
										<HugeiconsIcon
											icon={Smartphone}
											strokeWidth={2}
											className="size-5"
										/>
									</ToolbarButton>
								</aside>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</div>
	);
}

function ToolbarButton({
	label,
	children,
	className,
	onClick,
	disabled = false,
	variant = "ghost",
	ariaExpanded,
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
	disabled?: boolean;
	variant?: "brand" | "ghost";
	ariaExpanded?: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						size="icon"
						variant={variant}
						className={cn(
							"rounded-lg text-primary hover:text-primary",
							className,
						)}
						aria-label={label}
						aria-expanded={ariaExpanded}
						onClick={onClick}
						disabled={disabled}
					/>
				}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent sideOffset={12}>{label}</TooltipContent>
		</Tooltip>
	);
}

function PageListItem({
	page,
	onSelect,
}: {
	page: OwnedPageSummary;
	onSelect: () => void;
}) {
	return (
		<Button
			render={<Link to="/$handle" params={{ handle: page.handle }} />}
			size="lg"
			variant="ghost"
			nativeButton={false}
			onClick={onSelect}
			className="h-10 min-w-0 max-w-40 flex-none justify-start rounded-lg px-2"
		>
			<Avatar size="sm" className="size-5">
				<AvatarImage src={getProfileImageUrl(page.image) ?? undefined} alt="" />
				<AvatarFallback />
				{page.isPrimary ? (
					<AvatarBadge className="size-3! -right-1 -bottom-1 [&>svg]:size-full! bg-transparent ring-0">
						<BadgeCheckIcon
							className="stroke-white fill-brand size-full!"
							aria-hidden="true"
						/>
					</AvatarBadge>
				) : null}
			</Avatar>
			<span className="truncate">{page.name?.trim() || page.handle}</span>
		</Button>
	);
}

function PageListSkeleton() {
	return (
		<div className="flex flex-row items-center gap-1" aria-hidden="true">
			{["primary", "secondary"].map((key) => (
				<div
					key={key}
					className="flex h-10 w-28 flex-none items-center gap-2 rounded-lg px-2"
				>
					<div className="size-6 rounded-full bg-muted" />
					<div className="h-3.5 w-24 rounded-md bg-muted" />
				</div>
			))}
		</div>
	);
}
