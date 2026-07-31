import { getLinkProviderPresentation } from "@sinabro/api";
import { useEffect, useState } from "react";
import { Envelope } from "reicon-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ItemRendererProps } from "@/lib/grid/item-registry";
import type { GridItemByType, PresetName } from "@/lib/grid/types";
import {
	getConfiguredLinkProviderPresentation,
	getLinkCardThemeStyle,
} from "@/lib/link/provider-presentation";
import type { PageMode } from "@/lib/page/page-mode";
import { cn } from "@/lib/utils";

function getHostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function getProviderFallback(url: string) {
	const presentation = getLinkProviderPresentation(url);
	const providerPresentation = getConfiguredLinkProviderPresentation(
		presentation.id,
	);
	return {
		label: presentation.label,
		...(providerPresentation ?? {}),
	};
}

function LinkAction({
	href,
	label,
	actionBackground,
	actionText,
	actionVariant,
	className,
}: {
	href: string;
	label: string;
	actionBackground?: string;
	actionText?: string;
	actionVariant?: "solid" | "outline";
	className?: string;
}) {
	return (
		<Button
			render={
				<a
					href={href}
					target="_blank"
					rel="noreferrer"
					aria-label={label}
					className="font-light!"
				>
					<span>{label}</span>
				</a>
			}
			nativeButton={false}
			variant={
				actionVariant === "outline"
					? "outline"
					: actionBackground && actionText
						? "default"
						: "secondary"
			}
			size="sm"
			style={
				actionBackground && actionText
					? { backgroundColor: actionBackground, color: actionText }
					: undefined
			}
			className={cn(
				"cursor-pointer! self-start shrink-0 rounded-md text-sm",
				!actionBackground &&
					"border border-border bg-[#f6f8fa] hover:bg-[#f6f8fa]/80",
				className,
			)}
		/>
	);
}

function LinkBadge({
	faviconUrl,
	url,
}: {
	faviconUrl: string | undefined;
	url: string;
}) {
	const fallback = getProviderFallback(url);
	const isMailto = url.toLowerCase().startsWith("mailto:");
	const className = cn(
		"inline-flex size-8 shrink-0 cursor-pointer! items-center justify-center overflow-hidden rounded-md bg-muted transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
		!faviconUrl && "size-11 rounded-2xl px-2 text-center text-xs font-semibold",
		isMailto && "bg-brand text-primary-foreground",
	);

	if (isMailto) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noreferrer"
				aria-label={`Open ${fallback.label}`}
				className={cn(className, "rounded-lg size-8 surface-line p-1")}
			>
				<Envelope aria-hidden="true" size={32} weight="Filled" />
				<span className="sr-only">{fallback.label}</span>
			</a>
		);
	}

	if (faviconUrl) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noreferrer"
				aria-label={`Open ${fallback.label}`}
				className={cn(className, "surface-line")}
			>
				<img src={faviconUrl} alt="" className="size-full object-contain" />
			</a>
		);
	}

	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			aria-label={`Open ${fallback.label}`}
			className={className}
			style={
				!faviconUrl ? { backgroundColor: fallback.cardBackground } : undefined
			}
		>
			<span className="sr-only">{fallback.label}</span>
		</a>
	);
}

function LinkPreview({
	imageUrl,
	url,
	isLoading,
}: {
	imageUrl: string | undefined;
	url: string;
	isLoading: boolean;
}) {
	const fallback = getProviderFallback(url);

	if (isLoading && !imageUrl) {
		return <Skeleton className="size-full rounded-none" />;
	}

	if (imageUrl) {
		return <img src={imageUrl} alt="" className="size-full object-cover" />;
	}

	return (
		<div
			className="flex size-full items-center justify-center px-4 text-center text-lg font-semibold tracking-tight"
			style={{ backgroundColor: fallback.cardBackground }}
		>
			{/*{fallback.label}*/}
		</div>
	);
}

function getTitle(item: GridItemByType<"link">) {
	return item.data.metadata?.title?.trim() ?? getHostname(item.data.url);
}

function LinkTitle({
	title,
	preset,
	mode,
	onCommit,
}: {
	title: string;
	preset: PresetName;
	mode: PageMode;
	onCommit: (value: string) => void;
}) {
	const isHalfBanner = preset === "halfBanner";
	const isLandscape = preset === "landscape";
	const isSquareSmall = preset === "squareSmall";
	const isTall = preset === "squareLarge" || preset === "portrait";
	const [value, setValue] = useState(title);

	useEffect(() => {
		setValue(title);
	}, [title]);

	if (isHalfBanner && mode === "view") {
		return (
			<div className="min-w-0 truncate px-1 text-sm font-normal text-foreground">
				{title}
			</div>
		);
	}

	return (
		<Textarea
			aria-label="Link title"
			rows={1}
			value={value}
			style={
				isHalfBanner || isLandscape
					? { fieldSizing: "fixed", width: "100%" }
					: undefined
			}
			wrap={isHalfBanner ? "off" : "soft"}
			onChange={(event) => setValue(event.target.value)}
			onBlur={(event) => {
				event.currentTarget.scrollTo({
					top: 0,
					left: 0,
					behavior: "smooth",
				});
				const nextValue = value.trim();
				if (nextValue) onCommit(nextValue);
			}}
			className={cn(
				"link-title-input block min-h-0 w-full min-w-24 max-w-full resize-none rounded-sm border-0 bg-transparent px-1 py-0 text-sm font-normal wrap-break-wordtext-foreground outline-none focus-visible:ring-0",
				(isHalfBanner || isLandscape) && "field-sizing-fixed",
				isHalfBanner
					? "h-8 max-h-8 overflow-hidden whitespace-nowrap leading-8"
					: "max-h-full overflow-x-hidden overflow-y-auto leading-6",
				isLandscape && "flex-1",
				isSquareSmall && "flex-1",
				isTall && "flex-1",
			)}
		/>
	);
}

function isHalfBannerPreset(preset: PresetName) {
	return preset === "halfBanner";
}

function isLandscapePreset(preset: PresetName) {
	return preset === "landscape";
}

function isTallPreset(preset: PresetName) {
	return preset === "squareLarge" || preset === "portrait";
}

export function LinkItemRenderer({
	item,
	preset,
	isEnriching = false,
	mode,
	onCommand,
}: ItemRendererProps<GridItemByType<"link">>) {
	const title = getTitle(item);
	const faviconUrl = item.data.metadata?.faviconUrl;
	const imageUrl = item.data.metadata?.imageUrl;
	const provider = getLinkProviderPresentation(item.data.url).id;
	const providerPresentation = getConfiguredLinkProviderPresentation(provider);
	const shouldShowLinkAction = provider !== "generic-web";
	const linkActionProps = {
		label:
			providerPresentation?.actionLabel ??
			(provider === "mailto" ? "Send" : "Open"),
		actionBackground: providerPresentation?.actionBackground,
		actionText: providerPresentation?.actionText,
		actionVariant: providerPresentation?.actionVariant,
	};
	const cardClassName = providerPresentation && "link-card-themed";
	const cardStyle = getLinkCardThemeStyle(provider);
	const updateTitle = (value: string) => {
		onCommand?.({
			type: "update-data",
			itemId: item.id,
			data: {
				...item.data,
				metadata: {
					...item.data.metadata,
					title: value,
				},
			},
		});
	};

	if (preset === "squareSmall" || isHalfBannerPreset(preset)) {
		return (
			<div
				className={cn(
					"flex size-full min-h-0 gap-1 p-4",
					isHalfBannerPreset(preset) ? "items-center" : "flex-col items-start",
					cardClassName,
				)}
				style={cardStyle}
			>
				<LinkBadge faviconUrl={faviconUrl} url={item.data.url} />
				<div
					className={cn(
						"min-h-0 min-w-0",
						isHalfBannerPreset(preset)
							? "flex-1"
							: "flex w-full flex-1 flex-col",
					)}
				>
					<LinkTitle
						title={title}
						preset={preset}
						mode={mode}
						onCommit={updateTitle}
					/>
				</div>
				{shouldShowLinkAction && (
					<LinkAction
						href={item.data.url}
						{...linkActionProps}
						className={
							isHalfBannerPreset(preset) ? "self-stretch h-full" : undefined
						}
					/>
				)}
			</div>
		);
	}

	const content = (
		<div
			className={cn(
				"flex min-h-0 min-w-0 flex-col items-start gap-2",
				isLandscapePreset(preset) && "items-stretch",
				isLandscapePreset(preset)
					? "flex-[4]"
					: isTallPreset(preset)
						? "flex-[3]"
						: undefined,
				(isLandscapePreset(preset) || isTallPreset(preset)) &&
					"justify-between",
				isLandscapePreset(preset) && "h-full",
				isTallPreset(preset) && "items-stretch",
				cardClassName,
			)}
			style={cardStyle}
		>
			<div
				className={cn(
					"flex min-h-0 min-w-0 flex-col items-start gap-1",
					isLandscapePreset(preset) && "w-full",
					(isLandscapePreset(preset) || isTallPreset(preset)) && "flex-1",
					isTallPreset(preset) && "items-stretch",
				)}
			>
				<LinkBadge faviconUrl={faviconUrl} url={item.data.url} />
				<LinkTitle
					title={title}
					preset={preset}
					mode={mode}
					onCommit={updateTitle}
				/>
			</div>
			{shouldShowLinkAction && (
				<LinkAction href={item.data.url} {...linkActionProps} />
			)}
		</div>
	);

	if (isLandscapePreset(preset)) {
		return (
			<div
				className={cn(
					"flex size-full flex-row-reverse items-stretch gap-3 p-4",
					cardClassName,
				)}
				style={cardStyle}
			>
				<div className="relative min-h-0 min-w-0 flex-[3] overflow-hidden rounded-lg bg-muted">
					<LinkPreview
						imageUrl={imageUrl}
						url={item.data.url}
						isLoading={isEnriching}
					/>
				</div>
				{content}
			</div>
		);
	}

	if (isTallPreset(preset)) {
		return (
			<div
				className={cn(
					"flex size-full min-h-0 flex-col gap-3 p-4",
					cardClassName,
				)}
				style={cardStyle}
			>
				{content}
				<div className="relative min-h-0 flex-[2] overflow-hidden rounded-lg bg-muted">
					<LinkPreview
						imageUrl={imageUrl}
						url={item.data.url}
						isLoading={isEnriching}
					/>
				</div>
			</div>
		);
	}

	return null;
}
