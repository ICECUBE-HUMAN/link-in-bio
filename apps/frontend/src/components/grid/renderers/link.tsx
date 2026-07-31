import { ExternalLink, Link2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType, PresetName } from "@/lib/grid/types";
import { cn } from "@/lib/utils";

type ProviderFallback = {
	label: string;
	className: string;
};

function getHostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function getProviderFallback(hostname: string): ProviderFallback {
	if (hostname.includes("github")) {
		return {
			label: "GitHub",
			className: "bg-neutral-900 text-white",
		};
	}
	if (hostname.includes("youtube")) {
		return {
			label: "YouTube",
			className: "bg-red-500 text-white",
		};
	}
	if (hostname.includes("instagram")) {
		return {
			label: "Instagram",
			className:
				"bg-[linear-gradient(135deg,#f58529,#feda77,#dd2a7b,#8134af,#515bd4)] text-white",
		};
	}
	if (hostname.includes("x.com") || hostname.includes("twitter")) {
		return {
			label: "X",
			className: "bg-black text-white",
		};
	}
	if (hostname.includes("notion")) {
		return {
			label: "Notion",
			className: "bg-white text-black border border-border/70",
		};
	}

	return {
		label:
			hostname
				.split(".")[0]
				.replace(/[^a-z0-9]/gi, " ")
				.trim()
				.slice(0, 18) || "Link",
		className: "bg-muted text-foreground",
	};
}

function LinkAction({ href }: { href: string }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/85"
		>
			Open
		</a>
	);
}

function LinkBadge({
	faviconUrl,
	hostname,
}: {
	faviconUrl: string | undefined;
	hostname: string;
}) {
	const fallback = getProviderFallback(hostname);

	if (faviconUrl) {
		return (
			<div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
				<img src={faviconUrl} alt="" className="size-6 object-contain" />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex size-11 shrink-0 items-center justify-center rounded-2xl px-2 text-center text-xs font-semibold",
				fallback.className,
			)}
		>
			{fallback.label}
		</div>
	);
}

function LinkPreview({
	imageUrl,
	hostname,
	isLoading,
}: {
	imageUrl: string | undefined;
	hostname: string;
	isLoading: boolean;
}) {
	const fallback = getProviderFallback(hostname);

	if (isLoading && !imageUrl) {
		return <Skeleton className="size-full rounded-none" />;
	}

	if (imageUrl) {
		return <img src={imageUrl} alt="" className="size-full object-cover" />;
	}

	return (
		<div
			className={cn(
				"flex size-full items-center justify-center px-4 text-center text-lg font-semibold tracking-tight",
				fallback.className,
			)}
		>
			{fallback.label}
		</div>
	);
}

function getTitle(item: GridItemByType<"link">) {
	return item.data.metadata?.title?.trim() || getHostname(item.data.url);
}

function isCompactPreset(preset: PresetName) {
	return preset === "squareSmall" || preset === "halfBanner";
}

export function LinkItemRenderer({
	item,
	preset,
	isEnriching = false,
}: ItemRendererProps<GridItemByType<"link">>) {
	const hostname = getHostname(item.data.url);
	const title = getTitle(item);
	const faviconUrl = item.data.metadata?.faviconUrl;
	const imageUrl = item.data.metadata?.imageUrl;

	if (isCompactPreset(preset)) {
		return (
			<div className="flex size-full items-center gap-3 p-4">
				<LinkBadge faviconUrl={faviconUrl} hostname={hostname} />
				<div className="min-w-0 flex-1">
					<p className="line-clamp-2 text-sm font-semibold text-foreground">
						{title}
					</p>
				</div>
				<a
					href={item.data.url}
					target="_blank"
					rel="noreferrer"
					aria-label={`Open ${title}`}
					className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground transition-colors hover:text-foreground"
				>
					<ExternalLink className="size-4" />
				</a>
			</div>
		);
	}

	return (
		<div className="flex size-full min-h-0 flex-col">
			<div className="relative min-h-0 flex-1 overflow-hidden bg-muted">
				<LinkPreview
					imageUrl={imageUrl}
					hostname={hostname}
					isLoading={isEnriching}
				/>
				<div className="absolute left-4 top-4 inline-flex h-9 items-center gap-2 rounded-full bg-background/88 px-3 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
					<Link2 className="size-3.5" />
					<span className="line-clamp-1">{title}</span>
				</div>
			</div>
			<div className="flex items-center justify-between gap-3 p-4">
				<p
					className={cn(
						"min-w-0 flex-1 text-sm font-semibold text-foreground",
						preset === "portrait" ? "line-clamp-3" : "line-clamp-2",
					)}
				>
					{title}
				</p>
				<LinkAction href={item.data.url} />
			</div>
		</div>
	);
}
