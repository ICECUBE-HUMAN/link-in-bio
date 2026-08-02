import {
	ChevronLeftIcon,
	Link02Icon,
	Unlink02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TrashIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { PresetIcon } from "@/components/grid/preset-icon";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import type {
	GridItemCommandHandler,
	ItemControlsProps,
} from "@/lib/grid/item-registry";
import { cn } from "@/lib/utils";

type ItemDeleteButtonProps = {
	itemId: string;
	onCommand: GridItemCommandHandler;
};

export function ItemDeleteButton({ itemId, onCommand }: ItemDeleteButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label="Delete"
			title="Delete"
			onClick={() => onCommand({ type: "delete-item", itemId })}
			className="cursor-pointer! absolute -top-4 -right-4 z-20 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background opacity-0 shadow-md transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/grid-item:scale-100 group-hover/grid-item:opacity-100 motion-reduce:transition-none"
		>
			<TrashIcon className="size-5 stroke-3" />
		</Button>
	);
}

export function ItemControls({
	item,
	capabilities,
	onCommand,
}: ItemControlsProps) {
	const [view, setView] = useState<"toolbar" | "link">("toolbar");
	const [linkUrl, setLinkUrl] = useState("");
	const shouldReduceMotion = useReducedMotion();
	const menuControls = capabilities.controls.filter(
		(control) => control.command !== "delete-item",
	);
	const linkItem = item.type === "text" || item.type === "media" ? item : null;
	const controlsWidth = menuControls.length * 32 + 8;
	const viewTransition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };

	useEffect(() => {
		if (view === "link") setLinkUrl(linkItem?.data.link ?? "");
	}, [linkItem, view]);

	function closeLinkView() {
		setLinkUrl("");
		setView("toolbar");
	}

	function updateLink(value: string) {
		if (!linkItem) return;
		onCommand?.({
			type: "update-data",
			itemId: linkItem.id,
			data: { ...linkItem.data, link: value || undefined },
		});
	}

	if (menuControls.length === 0) {
		return null;
	}

	return (
		<motion.div
			layout
			transition={{ layout: viewTransition }}
			style={{ width: controlsWidth }}
			className="flex h-10 flex-nowrap items-center gap-0.5 overflow-hidden rounded-lg bg-black p-1 shadow-lg"
		>
			<AnimatePresence initial={false} mode="popLayout">
				{view === "link" && linkItem ? (
					<motion.div
						key="link-view"
						initial={{ opacity: 0, transform: "translateX(8px)" }}
						animate={{ opacity: 1, transform: "translateX(0px)" }}
						exit={{ opacity: 0, transform: "translateX(-8px)" }}
						transition={viewTransition}
						className="flex w-full min-w-0 items-center gap-0"
					>
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label="Back to controls"
							className="cursor-pointer! rounded-md text-white hover:bg-muted-foreground/40 hover:text-background/90"
							onClick={closeLinkView}
						>
							<HugeiconsIcon
								icon={ChevronLeftIcon}
								strokeWidth={2}
								className="size-5"
							/>
						</Button>
						<InputGroup className="h-8 min-w-0 flex-1 rounded-full bg-transparent text-white has-[[data-slot=input-group-control]:focus-visible]:ring-0">
							<InputGroupInput
								placeholder="Paste a link"
								aria-label="Link URL"
								className="px-1"
								value={linkUrl}
								onChange={(event) => {
									const value = event.target.value;
									setLinkUrl(value);
									updateLink(value);
								}}
								autoFocus
								autoComplete="off"
							/>
						</InputGroup>
					</motion.div>
				) : (
					<motion.div
						key="toolbar-view"
						initial={{ opacity: 0, transform: "translateX(-8px)" }}
						animate={{ opacity: 1, transform: "translateX(0px)" }}
						exit={{ opacity: 0, transform: "translateX(8px)" }}
						transition={viewTransition}
						className="flex items-center gap-0"
					>
						{menuControls.map((control) => (
							<Button
								key={`${item.id}:${control.command}:${control.preset ?? control.label}`}
								type="button"
								size={
									control.command === "apply-preset" ||
									control.command === "manage-link"
										? "icon-sm"
										: "xs"
								}
								className={cn(
									control.command === "apply-preset" ||
										control.command === "manage-link"
										? "cursor-pointer! rounded-md text-white hover:bg-white/20 hover:text-white"
										: "cursor-pointer! rounded-full",
									control.isActive && "bg-white text-black hover:bg-white/90",
								)}
								variant={
									control.command === "apply-preset" ||
									control.command === "manage-link"
										? "ghost"
										: "secondary"
								}
								aria-label={control.label}
								aria-pressed={
									control.command === "apply-preset"
										? control.isActive
										: undefined
								}
								title={control.label}
								onClick={() => {
									if (control.command === "apply-preset" && control.preset) {
										onCommand?.({
											type: "apply-preset",
											itemId: item.id,
											preset: control.preset,
										});
										return;
									}

									if (control.command === "manage-link") {
										setLinkUrl(linkItem?.data.link ?? "");
										setView("link");
									}
								}}
							>
								{control.command === "apply-preset" && control.preset ? (
									<PresetIcon
										preset={control.preset}
										className={control.isActive ? "text-black" : "text-white"}
									/>
								) : control.command === "manage-link" ? (
									<HugeiconsIcon
										icon={linkItem?.data.link ? Link02Icon : Unlink02Icon}
										strokeWidth={2.5}
										className="size-4 text-white"
									/>
								) : (
									control.label
								)}
							</Button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
