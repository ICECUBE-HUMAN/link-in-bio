import {
	ChevronLeftIcon,
	Computer,
	Smartphone,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { PageResponse } from "@sinabro/api";
import {
	ITEM_MEDIA_ACCEPT,
	MAX_ITEM_MEDIA_SIZE,
	normalizeLinkUrl,
} from "@sinabro/api";
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
}: ToolbarProps) {
	const mediaInputRef = useRef<HTMLInputElement>(null);
	const [view, setView] = useState<"toolbar" | "link" | "widget">("toolbar");
	const [linkUrl, setLinkUrl] = useState("");
	const canAddLink = normalizeLinkInput(linkUrl) !== null;
	const shouldReduceMotion = useReducedMotion();

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
		<div className="fixed bottom-8 flex w-full items-center justify-center">
			<input
				ref={mediaInputRef}
				type="file"
				accept={ITEM_MEDIA_ACCEPT}
				hidden
				onChange={handleMediaChange}
			/>
			<motion.div
				layout
				transition={{ layout: viewTransition }}
				className="flex items-center overflow-hidden rounded-full bg-test p-1.5"
			>
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
								className="rounded-full text-muted-foreground hover:bg-muted-foreground/40 hover:text-background/90"
								onClick={() => setView("toolbar")}
							>
								<HugeiconsIcon
									icon={ChevronLeftIcon}
									strokeWidth={2}
									className="size-5"
								/>
							</Button>
							<InputGroup className="h-9 w-64 rounded-full bg-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0 text-white">
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
										className="bg-brand text-primary-foreground hover:bg-brand/80 hover:text-primary-foreground"
										disabled={!canAddLink}
										onClick={() => {
											submitLink(linkUrl);
										}}
									>
										<Send weight="Filled" className="size-4" />
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
								className="rounded-full text-muted-foreground hover:bg-muted-foreground/40 hover:text-background/90"
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
								<div className="hidden items-center min-[90rem]:flex">
									{isSaving ? (
										<Button
											variant="brand"
											size="default"
											className="surface-line w-28 px-8"
											disabled
										>
											<Loader className="size-4 animate-spin" />
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
										onClick={() => setView("link")}
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
										onClick={() => setView("widget")}
									>
										<Widget4 weight="Outline" className="size-5" />
									</ToolbarButton>
								</div>
								<Separator
									orientation="vertical"
									className="my-3 hidden rounded-2xl bg-muted-foreground/60 data-vertical:w-0.5 min-[90rem]:flex"
								/>
								<aside className="hidden space-x-0 text-muted-foreground min-[90rem]:flex">
									<ToolbarButton
										label="Wide"
										onClick={() => onBreakpointChange("wide")}
										className={cn(
											breakpoint === "wide" &&
												"bg-muted-foreground/40 text-background/90",
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
												"bg-muted-foreground/40 text-background/90",
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
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
	disabled?: boolean;
	variant?: "brand" | "ghost";
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
							"rounded-full hover:bg-muted-foreground/40 hover:text-background/90",
							className,
						)}
						onClick={onClick}
						disabled={disabled}
					/>
				}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent sideOffset={8}>{label}</TooltipContent>
		</Tooltip>
	);
}
