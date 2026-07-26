import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { DEFAULT_SITE_NAME } from "@/lib/seo/metadata";
import { cn } from "@/lib/shared/utils";
import { isAnnouncementEnabled } from "./announcement.config";

type AnnouncementProps = {
	message?: string;
	ctaLabel?: string;
	to?: string;
	className?: string;
	messageClassName?: string;
	ctaClassName?: string;
};

const DEFAULT_MESSAGE = `${DEFAULT_SITE_NAME} has been sunset.`;
const DEFAULT_CTA_LABEL = "See what's new";

export function AnnouncementBadge({
	message = DEFAULT_MESSAGE,
	ctaLabel = DEFAULT_CTA_LABEL,
	to = "/_header/explore",
	className,
	messageClassName,
	ctaClassName,
}: AnnouncementProps) {
	return (
		<div
			className={cn(
				"inline-flex max-w-full items-center gap-2 rounded-full  bg-indigo-400/80 px-4 py-2 text-sm font-medium text-background",
				className,
			)}
		>
			<span>🎉</span>
			<span className={cn("min-w-0 truncate shimmer", messageClassName)}>
				{message}
			</span>
			<Link
				to={to}
				className={cn(
					"inline-flex shrink-0 items-center gap-1 font-semibold text-background transition-opacity hover:opacity-70",
					ctaClassName,
				)}
			>
				{ctaLabel}
				<ArrowRightIcon className="size-3.5" />
			</Link>
		</div>
	);
}

export default function Announcement({
	message = DEFAULT_MESSAGE,
	ctaLabel = DEFAULT_CTA_LABEL,
	to = "/_header/explore",
	className,
	messageClassName,
	ctaClassName,
}: AnnouncementProps) {
	const [isOpen, setIsOpen] = useState(true);

	if (!isAnnouncementEnabled || !isOpen) {
		return null;
	}

	return (
		<div
			className={cn(
				"fixed inset-x-0 top-0 z-50 bg-indigo-400 backdrop-blur-md",
				className,
			)}
		>
			<div className="relative min-h-11 px-4 py-2 text-sm font-medium text-primary-foreground">
				<div className="mx-auto flex min-h-7 max-w-4xl items-center justify-center gap-2 text-center">
					<span>🎉</span>
					<span className={cn("truncate shimmer", messageClassName)}>
						{message}
					</span>
					<Link
						to={to}
						className={cn(
							"inline-flex shrink-0 items-center gap-1 font-semibold text-primary-foreground transition-opacity hover:opacity-70",
							ctaClassName,
						)}
					>
						{ctaLabel}
						<ArrowRightIcon className="size-3.5" />
					</Link>
				</div>
				<button
					type="button"
					aria-label="Close announcement"
					className="absolute top-1/2 right-4 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-primary-foreground/80 transition-opacity hover:opacity-70"
					onClick={() => setIsOpen(false)}
				>
					<XIcon className="size-4 stroke-3" />
				</button>
			</div>
		</div>
	);
}
