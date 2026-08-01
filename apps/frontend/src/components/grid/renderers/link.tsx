import { getLinkProviderPresentation } from "@sinabro/api";
import { AnimatePresence, motion } from "motion/react";
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

function formatProviderCount(value: unknown): string | undefined {
	const count =
		typeof value === "number"
			? value
			: typeof value === "string" && value.trim()
				? Number(value)
				: Number.NaN;
	if (!Number.isFinite(count)) return undefined;
	return new Intl.NumberFormat("en-US", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(count);
}

function getProviderCount(
	provider: ReturnType<typeof getLinkProviderPresentation>["id"],
	providerData: Record<string, unknown> | undefined,
): string | undefined {
	if (
		provider === "threads" &&
		typeof providerData?.followerCountLabel === "string" &&
		providerData.followerCountLabel.trim()
	) {
		return providerData.followerCountLabel.trim();
	}
	const countKey = (
		{
			discord: "memberCount",
			chzzk: "followerCount",
			instagram: "followerCount",
			tiktok: "followerCount",
			threads: "followerCount",
			youtube: "subscriberCount",
			twitch: "followerCount",
			x: "followerCount",
		} as Record<string, string>
	)[provider];
	return countKey ? formatProviderCount(providerData?.[countKey]) : undefined;
}

function LinkAction({
	href,
	label,
	detail,
	actionBackground,
	actionText,
	actionVariant,
	className,
}: {
	href: string;
	label: string;
	detail?: string;
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
					aria-label={detail ? `${label} ${detail}` : label}
					className="font-light!"
				>
					<span>{label}</span>
					{detail && (
						<span
							className={cn(
								"ml-1",
								actionBackground && actionText
									? "opacity-70"
									: "text-muted-foreground",
							)}
						>
							{detail}
						</span>
					)}
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
				"cursor-pointer! self-start shrink-0 rounded-md px-3 text-sm",
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
	imageUrls,
	url,
	isLoading,
}: {
	imageUrls: readonly string[];
	url: string;
	isLoading: boolean;
}) {
	const fallback = getProviderFallback(url);

	if (isLoading && imageUrls.length === 0) {
		return <Skeleton className="size-full rounded-none" />;
	}

	if (imageUrls.length > 1) {
		return (
			<div className="grid size-full grid-cols-2 gap-2">
				{imageUrls.map((imageUrl) => (
					<div
						key={imageUrl}
						className="min-h-0 min-w-0 overflow-hidden rounded-md bg-muted"
					>
						<img src={imageUrl} alt="" className="size-full object-cover" />
					</div>
				))}
			</div>
		);
	}

	const imageUrl = imageUrls[0];
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
				isHalfBanner || isLandscape || isSquareSmall || isTall
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
				(isHalfBanner || isLandscape || isSquareSmall || isTall) &&
					"field-sizing-fixed",
				isHalfBanner
					? "h-8 max-h-8 overflow-hidden whitespace-nowrap leading-8"
					: isTall
						? "h-20 max-h-20 overflow-x-hidden overflow-y-auto leading-5"
						: "max-h-full overflow-x-hidden overflow-y-auto leading-5",
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
	const provider = getLinkProviderPresentation(item.data.url).id;
	const providerData = item.data.metadata?.providerData as
		| Record<string, unknown>
		| undefined;
	const channelImageUrl =
		provider === "youtube" && typeof providerData?.channelImageUrl === "string"
			? providerData.channelImageUrl.trim() || undefined
			: undefined;
	const imageUrl = channelImageUrl ?? item.data.metadata?.imageUrl;
	const recentVideoThumbnailUrls =
		provider === "youtube" &&
		Array.isArray(providerData?.recentVideoThumbnailUrls)
			? providerData.recentVideoThumbnailUrls.filter(
					(value): value is string =>
						typeof value === "string" && value.trim().length > 0,
				)
			: [];
	const imageUrls =
		recentVideoThumbnailUrls.length > 0
			? recentVideoThumbnailUrls
			: imageUrl
				? [imageUrl]
				: [];
	const providerPresentation = getConfiguredLinkProviderPresentation(provider);
	const shouldShowLinkAction = provider !== "generic-web";
	const providerCount = getProviderCount(provider, providerData);
	const actionHref = item.data.url;
	const baseActionLabel =
		providerPresentation?.actionLabel ??
		(provider === "mailto" ? "Send" : "Open");
	const linkActionProps = {
		label: baseActionLabel,
		detail: providerCount,
		actionBackground: providerPresentation?.actionBackground,
		actionText: providerPresentation?.actionText,
		actionVariant: providerPresentation?.actionVariant,
	};
	const cardClassName = providerPresentation && "link-card-themed";
	const cardStyle = getLinkCardThemeStyle(provider);
	const isSquareSmall = preset === "squareSmall";
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

	const renderPreset = () => {
		if (preset === "squareSmall" || isHalfBannerPreset(preset)) {
			const leadingContent = isSquareSmall ? (
				<div className="flex w-full flex-1 flex-col gap-1">
					<LinkBadge faviconUrl={faviconUrl} url={item.data.url} />
					<div className="flex min-h-0 min-w-0 flex-1 flex-col">
						<LinkTitle
							title={title}
							preset={preset}
							mode={mode}
							onCommit={updateTitle}
						/>
					</div>
				</div>
			) : (
				<div className="flex min-w-0 flex-1 items-center gap-1">
					<LinkBadge faviconUrl={faviconUrl} url={item.data.url} />
					<div className="min-h-0 min-w-0 flex-1">
						<LinkTitle
							title={title}
							preset={preset}
							mode={mode}
							onCommit={updateTitle}
						/>
					</div>
				</div>
			);

			return (
				<div
					className={cn(
						"flex size-full min-h-0 p-4",
						isHalfBannerPreset(preset)
							? "items-center justify-between gap-1"
							: "flex-col items-start justify-between gap-2",
						cardClassName,
					)}
					style={cardStyle}
				>
					{leadingContent}
					{shouldShowLinkAction && (
						<LinkAction
							href={actionHref}
							{...linkActionProps}
							className={
								isHalfBannerPreset(preset) ? "self-center h-8" : undefined
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
						? "flex-4"
						: isTallPreset(preset)
							? "flex-3"
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
					<LinkAction href={actionHref} {...linkActionProps} />
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
					{imageUrls.length > 0 && (
						<div className="relative min-h-0 min-w-0 flex-4 overflow-hidden rounded-lg bg-muted">
							<LinkPreview
								imageUrls={imageUrls}
								url={item.data.url}
								isLoading={isEnriching}
							/>
						</div>
					)}
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
					{imageUrls.length > 0 && (
						<div className="relative min-h-0 flex-3 overflow-hidden rounded-lg bg-muted">
							<LinkPreview
								imageUrls={imageUrls}
								url={item.data.url}
								isLoading={isEnriching}
							/>
						</div>
					)}
				</div>
			);
		}

		return null;
	};

	return (
		<AnimatePresence initial={false} mode="popLayout">
			<motion.div
				key={preset}
				initial={{ opacity: 0, filter: "blur(2px)" }}
				animate={{ opacity: 1, filter: "blur(0px)" }}
				exit={{ opacity: 0, filter: "blur(2px)" }}
				transition={{
					duration: 0.18,
					ease: [0.23, 1, 0.32, 1],
				}}
				className="size-full min-h-0 min-w-0"
			>
				{renderPreset()}
			</motion.div>
		</AnimatePresence>
	);
}
