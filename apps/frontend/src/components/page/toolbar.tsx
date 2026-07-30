import {
	ChevronLeftIcon,
	Computer,
	Smartphone,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
	Document2,
	GalleryCircle,
	Globe,
	LinkCircle3,
	Send,
	TextCircle,
} from "reicon-react";
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

type ToolbarProps = {
	breakpoint: Breakpoint;
	onBreakpointChange: (breakpoint: Breakpoint) => void;
	onItemAdd: (itemType: ItemType, url?: string) => void;
};

function isHttpsUrl(value: string) {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
}

export default function Toolbar({
	breakpoint,
	onBreakpointChange,
	onItemAdd,
}: ToolbarProps) {
	const [isLinkView, setIsLinkView] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const canAddLink = isHttpsUrl(linkUrl.trim());
	const shouldReduceMotion = useReducedMotion();

	const viewTransition = shouldReduceMotion
		? { duration: 0 }
		: {
				duration: 0.2,
				ease: [0.23, 1, 0.32, 1] as const,
			};

	return (
		<div className="fixed bottom-8 flex w-full items-center justify-center">
			<motion.div
				layout="size"
				transition={{ layout: viewTransition }}
				className="flex items-center overflow-hidden rounded-full bg-test p-1.5"
			>
				<AnimatePresence initial={false} mode="popLayout">
					{isLinkView ? (
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
								className="rounded-full text-muted-foreground hover:bg-muted-foreground/40 hover:text-background/90 active:scale-[0.97]"
								onClick={() => setIsLinkView(false)}
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
									autoFocus
									autoComplete="off"
								/>
								<InputGroupAddon align="inline-end" className="pr-1.5">
									<InputGroupButton
										type="button"
										size="icon-sm"
										aria-label="Add link"
										className="bg-brand text-primary-foreground active:scale-[0.97]"
										disabled={!canAddLink}
										onClick={() => {
											const url = linkUrl.trim();
											if (!isHttpsUrl(url)) return;
											onItemAdd("link", url);
											setLinkUrl("");
											setIsLinkView(false);
										}}
									>
										<Send weight="Filled" className="size-4" />
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
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
								<div className="flex items-center gap-0 text-muted-foreground">
									<ToolbarButton
										label="Link"
										onClick={() => setIsLinkView(true)}
									>
										<LinkCircle3 weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton
										label="Section Title"
										onClick={() => onItemAdd("section")}
									>
										<Document2 weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton label="Text" onClick={() => onItemAdd("text")}>
										<TextCircle weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton
										label="Gallery"
										onClick={() => onItemAdd("media")}
									>
										<GalleryCircle weight="Outline" className="size-5" />
									</ToolbarButton>
									<ToolbarButton label="Map" onClick={() => onItemAdd("map")}>
										<Globe weight="Outline" className="size-5" />
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
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						size="icon"
						variant="ghost"
						className={cn(
							"rounded-full hover:bg-muted-foreground/40 hover:text-background/90",
							className,
						)}
						onClick={onClick}
					/>
				}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent sideOffset={8}>{label}</TooltipContent>
		</Tooltip>
	);
}
