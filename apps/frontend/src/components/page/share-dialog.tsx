import type { PageResponse } from "@sinabro/api";
import { Cuer } from "cuer";
import { Check, ChevronLeftIcon, QrCode } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Confetti from "react-confetti";
import { env } from "@/env";
import { getProfileImageUrl } from "@/lib/api/profile-image-api";
import { DEFAULT_IMAGE_DATA_URL } from "@/lib/shared/default-image";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../ui/dialog";

type ShareDialogProps = {
	page: PageResponse;
};

type ShareView = "share" | "qr";
type CopyState = "idle" | "copied" | "error";
type ConfettiParticle = {
	shape: number;
	w: number;
	h: number;
	radius: number;
};

type ShareProvider = {
	id: string;
	label: string;
	className: string;
	iconPath: string;
	getUrl: (pageUrl: string, text: string) => string;
};

const providers: ShareProvider[] = [
	{
		id: "x",
		label: "X",
		className: "bg-foreground text-background",
		iconPath: "x.svg",
		getUrl: (pageUrl: string, text: string) =>
			`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(text)}`,
	},
	{
		id: "threads",
		label: "Threads",
		className: "bg-foreground text-background",
		iconPath: "threads.svg",
		getUrl: (pageUrl: string, text: string) =>
			`https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${pageUrl}`)}`,
	},
	{
		id: "facebook",
		label: "Facebook",
		className: "bg-[#1877f2] text-white",
		iconPath: "facebook.svg",
		getUrl: (pageUrl: string) =>
			`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		className: "bg-[#0a66c2] text-white",
		iconPath: "linkedin.svg",
		getUrl: (pageUrl: string) =>
			`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
	},
	{
		id: "whatsapp",
		label: "WhatsApp",
		className: "bg-[#25d366] text-white",
		iconPath: "whatsapp.svg",
		getUrl: (pageUrl: string, text: string) =>
			`https://wa.me/?text=${encodeURIComponent(`${text} ${pageUrl}`)}`,
	},
	{
		id: "snapchat",
		label: "Snapchat",
		className: "bg-[#fffc00] text-black",
		iconPath: "snapchat.svg",
		getUrl: (pageUrl: string) =>
			`snapchat://creative-kit/share?attachmentUrl=${encodeURIComponent(pageUrl)}`,
	},
] as const;

function getPublicPageUrl(handle: string) {
	const configuredDomain = env.VITE_APP_DOMAIN.replace(/\/+$/, "");
	const origin = /^https?:\/\//.test(configuredDomain)
		? configuredDomain
		: `https://${configuredDomain}`;
	return new URL(`/${encodeURIComponent(handle)}`, origin).toString();
}

function getShareAddress(pageUrl: string) {
	const url = new URL(pageUrl);
	return `${url.host}${url.pathname}`;
}

function getShareIconUrl(iconPath: string) {
	if (!env.VITE_R2_PUBLIC_URL) return `/assets/link-provider-icon/${iconPath}`;
	return `${env.VITE_R2_PUBLIC_URL.replace(/\/+$/, "")}/assets/link-provider-icon/${iconPath}`;
}

function drawLargeConfetti(
	this: ConfettiParticle,
	context: CanvasRenderingContext2D,
) {
	const scale = 1.5;
	context.scale(scale, scale);

	if (this.shape === 0) {
		context.beginPath();
		context.arc(0, 0, this.radius, 0, 2 * Math.PI);
		context.fill();
		return;
	}

	if (this.shape === 1) {
		context.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
		return;
	}

	context.fillRect(-this.w / 6, -this.h / 2, this.w / 3, this.h);
}

export function ShareDialog({ page }: ShareDialogProps) {
	const [open, setOpen] = useState(false);
	const [view, setView] = useState<ShareView>("share");
	const [copyState, setCopyState] = useState<CopyState>("idle");
	const [showConfetti, setShowConfetti] = useState(false);
	const [viewport, setViewport] = useState({ width: 0, height: 0 });
	const copyResetRef = useRef<number | null>(null);
	const pageUrl = useMemo(() => getPublicPageUrl(page.handle), [page.handle]);
	const pageName = page.name?.trim() || "User";
	const profileImage = getProfileImageUrl(page.image) ?? DEFAULT_IMAGE_DATA_URL;
	const shareAddress = getShareAddress(pageUrl);
	const shareText = `Built a little space online. Take a look ↓\n${shareAddress}`;

	useEffect(() => {
		const updateViewport = () => {
			setViewport({ width: window.innerWidth, height: window.innerHeight });
		};

		updateViewport();
		window.addEventListener("resize", updateViewport);
		return () => window.removeEventListener("resize", updateViewport);
	}, []);

	useEffect(() => {
		return () => {
			if (copyResetRef.current !== null) {
				window.clearTimeout(copyResetRef.current);
			}
		};
	}, []);

	async function copyPage() {
		try {
			await navigator.clipboard.writeText(pageUrl);
			setCopyState("copied");
			setShowConfetti(true);
		} catch {
			setCopyState("error");
		}

		if (copyResetRef.current !== null) {
			window.clearTimeout(copyResetRef.current);
		}
		copyResetRef.current = window.setTimeout(() => {
			setCopyState("idle");
			copyResetRef.current = null;
		}, 1400);
	}

	function openProvider(provider: (typeof providers)[number]) {
		window.open(
			provider.getUrl(pageUrl, shareText),
			"_blank",
			"noopener,noreferrer",
		);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) {
					setView("share");
					return;
				}
				setView("share");
				setCopyState("idle");
			}}
		>
			<Button
				type="button"
				variant="brand"
				size="default"
				className="w-28 px-8"
				disabled={false}
				onClick={() => setOpen(true)}
			>
				Share
			</Button>
			<DialogContent
				showCloseButton={false}
				overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-0"
				className={cn(
					"t-modal box-border sm:max-w-md min-w-0 gap-0 overflow-x-hidden overflow-y-auto p-6 rounded-[3rem] shadow-brand",
					open ? "is-open" : "is-closing",
				)}
			>
				<DialogTitle className="sr-only">Share your page</DialogTitle>
				<DialogDescription className="sr-only">
					Share your public page or copy its link.
				</DialogDescription>
				{showConfetti && viewport.width > 0 ? (
					<div
						className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
						aria-hidden="true"
					>
						<Confetti
							className="size-full"
							width={viewport.width}
							height={viewport.height}
							numberOfPieces={180}
							recycle={false}
							run
							gravity={0.35}
							initialVelocityX={{ min: -2, max: 2 }}
							initialVelocityY={{ min: 4, max: 10 }}
							tweenDuration={3500}
							confettiSource={{ x: 0, y: 0, w: viewport.width, h: 0 }}
							drawShape={drawLargeConfetti}
							onConfettiComplete={() => setShowConfetti(false)}
						/>
					</div>
				) : null}

				<div
					className="t-page-slide t-share-page-slide min-w-0 max-w-full"
					data-page={view === "share" ? "1" : "2"}
				>
					<section className="t-page min-w-0 max-w-full" data-page-id="1">
						<div className="flex flex-row items-center justify-between mb-10">
							<div className="flex flex-row items-center gap-4">
								<img
									src={profileImage ?? DEFAULT_IMAGE_DATA_URL}
									alt={page.name ?? ""}
									className="size-12 object-cover rounded-full"
								/>
								<div className="flex flex-col justify-center">
									<div className="text-base font-semibold leading-tight">
										{pageName}
									</div>
									<div className="text-sm text-gray-bright">@{page.handle}</div>
								</div>
							</div>
							<aside>
								<Button
									type="button"
									variant="secondary"
									size="icon-lg"
									aria-label="View QR code"
									className="rounded-lg"
									onClick={() => setView("qr")}
								>
									<QrCode className="size-5" />
								</Button>
							</aside>
						</div>

						<p className="p-1 max-w-[32ch] text-sm leading-5 text-foreground/80 text-pretty wrap-break-word">
							<span>Built a little space online. Take a look ↓</span>
							<br />
							<span className="font-semibold">{shareAddress}</span>
						</p>

						<div className="mt-4 flex flex-col min-w-0 items-center justify-center overflow-hidden gap-3 p-8 rounded-xl smooth-shadow-ring-sm shadow-neutral-400 smooth-ring-neutral-300/20">
							<img
								src={profileImage}
								alt={pageName}
								className="object-cover object-center rounded-full size-24"
							/>
							<p className="text-2xl font-bold">{pageName}</p>
						</div>

						<div className="mt-10 flex flex-col gap-10">
							<div>
								<p className="text-base font-semibold tracking-[0.01em] text-foreground">
									Share with
								</p>
								<div className="no-scrollbar mt-3 flex w-full min-w-0 max-w-full flex-nowrap gap-4 overflow-x-auto overflow-y-hidden pb-1">
									{providers.map((provider) => (
										<Button
											key={provider.id}
											type="button"
											variant="ghost"
											size="icon"
											aria-label={`Share on ${provider.label}`}
											className={cn(
												"size-12 shrink-0 rounded-full border-0 shadow-none",
												provider.className,
											)}
											onClick={() => openProvider(provider)}
										>
											<img
												src={getShareIconUrl(provider.iconPath)}
												alt=""
												className="size-full rounded-full object-cover"
											/>
										</Button>
									))}
								</div>
							</div>
							<Button
								type="button"
								size="lg"
								variant="brand"
								className="t-copy-button h-14 w-full text-base rounded-full"
								data-state={copyState}
								onClick={() => void copyPage()}
							>
								<span className="t-copy-feedback gap-2!" aria-live="polite">
									<span className="t-copy-icon" aria-hidden="true">
										<Check className="size-5" />
									</span>
									<span className="t-copy-labels gap-2">
										<span className="t-copy-label t-copy-label-idle">Copy</span>
										<span className="t-copy-label t-copy-label-copied">
											{copyState === "error" ? "Copy failed" : "Copied"}
										</span>
									</span>
								</span>
							</Button>
						</div>
					</section>

					<section className="t-page flex flex-col" data-page-id="2">
						<aside>
							<Button
								type="button"
								variant="secondary"
								size="icon-lg"
								className="rounded-full"
								onClick={() => setView("share")}
							>
								<ChevronLeftIcon className="stroke-3 size-5 text-muted-foreground" />
							</Button>
						</aside>
						<div className="grow flex items-center justify-center p-4 text-black">
							<Cuer
								value={pageUrl}
								color="#171717"
								className="size-56"
								arena={profileImage}
								aria-label={`QR code for ${pageName}'s page`}
							/>
						</div>
					</section>
				</div>
			</DialogContent>
		</Dialog>
	);
}
