import {
	FREE_PAGE_LIMIT,
	type PlanPeriod,
	PRO_PAGE_LIMIT,
	PRO_PLANS,
} from "@sinabro/plan";
import { Player } from "@remotion/player";
import {
	Easing,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from "remotion";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

type PlanFeature = {
	label: string;
};

const FREE_FEATURES: PlanFeature[] = [
	{ label: `${FREE_PAGE_LIMIT} page` },
	{ label: "All core widgets" },
];

const PRO_FEATURES: PlanFeature[] = [
	{ label: `${PRO_PAGE_LIMIT} pages` },
	{ label: "All core widgets" },
	{ label: "Today's and yesterday's view counts" },
	{ label: "All future widgets" },
];

const PRO_FEATURE_HIGHLIGHTS = [
	{
		key: "pageviews",
		title: "Track your page views",
		subtitle: "See how many times your page was viewed today and yesterday.",
	},
	{
		key: "profiles",
		title: "Three pages, one account",
		subtitle:
			"Manage up to three profiles from one account—no switching needed.",
	},
] as const;

const ROLLING_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const PROFILE_DEMO_PAGES = [
	{
		handle: "founder",
		name: "wooky",
		image:
			"https://cdn.grabbin.me/users/m7u6wTOAJvOJLfH2aFP9yHIOWDgCjdms/8482ef70-083b-4c67-ba30-e3457ba35030/profile/232d1e6a-5bcf-466a-8714-5f75aeb23f2e.jpg",
	},
	{
		handle: "waldo",
		name: "Waldo",
		image:
			"https://cdn.grabbin.me/users/m7u6wTOAJvOJLfH2aFP9yHIOWDgCjdms/b08d1240-8d57-40aa-aebb-a87b96b24172/profile/10d86fff-e86c-40a5-aaa6-980d40ae42c6.png",
	},
	{
		handle: "averymorgan",
		name: "Morgan",
		image:
			"https://cdn.grabbin.me/users/m7u6wTOAJvOJLfH2aFP9yHIOWDgCjdms/2e809dce-a8d5-43af-be9f-04cd9d758524/profile/7b167b58-f9f6-430a-ac39-78d7a9cb82d9.png",
	},
] as const;

export default function PlanSection() {
	const navigate = useNavigate();
	const [billingPeriod, setBillingPeriod] = useState<PlanPeriod>("monthly");
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const selectedPrice = PRO_PLANS[billingPeriod];

	const startCheckout = async () => {
		setCheckoutError(null);
		setIsCheckingOut(true);

		try {
			const { data: session } = await authClient.getSession();

			if (!session?.user) {
				await navigate({ to: "/log-in" });
				return;
			}

			const { error } = await authClient.creem.createCheckout({
				productId: selectedPrice.productId,
			});
			if (error)
				setCheckoutError("Billing could not be started. Please try again.");
		} catch {
			setCheckoutError("Billing could not be started. Please try again.");
		} finally {
			setIsCheckingOut(false);
		}
	};

	return (
		<section
			className="mx-auto flex max-w-4xl flex-col gap-4 py-24"
			aria-labelledby="plans-heading"
		>
			<header className="flex flex-col gap-4 items-center mb-8">
				<h2
					id="plans-heading"
					className="flex flex-col items-center text-4xl font-semibold md:text-5xl text-balance text-center"
				>
					Start free. Grow with Pro.
				</h2>
				<p className="text-lg font-medium text-center text-balance md:text-xl">
					Every account includes one free page with core widgets. Upgrade to Pro
					for more pages and extra features as you grow.
				</p>
			</header>

			<div className="flex flex-col gap-4">
				<div className="flex justify-center">
					<BillingPeriodTabs
						value={billingPeriod}
						onChange={setBillingPeriod}
					/>
				</div>
				<PlanCard
					name="Upgrade to Pro"
					price={selectedPrice.price}
					suffix={selectedPrice.suffix}
					features={PRO_FEATURES}
					action={
						<div className="flex flex-col gap-3">
							<Button
								size="lg"
								variant="brand"
								className="w-full rounded-xl h-13 text-lg"
								onClick={startCheckout}
								disabled={isCheckingOut}
							>
								{isCheckingOut ? "Opening billing…" : `Get started`}
							</Button>
							{checkoutError ? (
								<p className="text-sm text-destructive" role="alert">
									{checkoutError}
								</p>
							) : null}
						</div>
					}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				{PRO_FEATURE_HIGHLIGHTS.map((feature) => (
					<article
						key={feature.key}
						className="flex flex-col gap-6 rounded-3xl bg-secondary/60 p-6"
					>
						<div
							className="aspect-4/3 rounded-2xl bg-background"
							data-feature-image={feature.key}
						>
							{feature.key === "profiles" ? (
								<ProfilesDemo />
							) : (
								<PageviewsDemo />
							)}
						</div>
						<div className="flex flex-col gap-2">
							<h3 className="text-2xl font-medium tracking-tight">
								{feature.title}
							</h3>
							<p className="text-base leading-relaxed text-gray-bright">
								{feature.subtitle}
							</p>
						</div>
					</article>
				))}
			</div>
			<p className="text-center text-base text-gray-bright md:text-xl">
				More features may be added based on users needs.
			</p>
		</section>
	);
}

function ProfilesDemo() {
	return (
		<Player
			component={ProfilesComposition}
			durationInFrames={300}
			compositionWidth={640}
			compositionHeight={480}
			fps={60}
			autoPlay
			loop
			initiallyMuted
			controls={false}
			clickToPlay={false}
			acknowledgeRemotionLicense
			style={{ height: "100%", width: "100%" }}
		/>
	);
}

function ProfilesComposition() {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const buttonPressProgress = spring({
		frame,
		fps,
		delay: 48,
		config: { damping: 12, mass: 0.35, stiffness: 130 },
	});
	const popoverProgress = spring({
		frame,
		fps,
		delay: 78,
		config: { damping: 13, mass: 0.35, stiffness: 150 },
	});
	const listExitProgress = spring({
		frame,
		fps,
		delay: 258,
		config: { damping: 14, mass: 0.35, stiffness: 170 },
	});
	const buttonReturnProgress = spring({
		frame,
		fps,
		delay: 270,
		config: { damping: 14, mass: 0.35, stiffness: 170 },
	});

	return (
		<div className="relative size-full overflow-hidden rounded-2xl bg-background">
			<div
				className="absolute left-1/2 top-1/2"
				style={{
					translate: "-50% -50%",
					scale:
						interpolate(buttonPressProgress, [0, 1], [1, 0.82], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
							output: "perceptual-scale",
						}) +
						interpolate(buttonReturnProgress, [0, 1], [0, 0.18], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}),
					opacity: Math.max(
						interpolate(buttonPressProgress, [0, 0.72, 1], [1, 1, 0], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}),
						interpolate(buttonReturnProgress, [0, 1], [0, 1], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}),
					),
				}}
			>
				<div className="flex min-w-[13rem] items-center justify-center gap-4 rounded-2xl bg-secondary px-5 py-4">
					<img
						src={PROFILE_DEMO_PAGES[0].image}
						alt=""
						className="size-14 shrink-0 rounded-full object-cover"
					/>
					<span className="text-3xl font-medium tracking-tight">
						{PROFILE_DEMO_PAGES[0].name}
					</span>
				</div>
			</div>

			<div
				className="absolute inset-y-0 left-1/2 flex w-[22rem] origin-center flex-col"
				style={{
					opacity:
						interpolate(popoverProgress, [0, 0.5, 1], [0, 1, 1], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}) *
						interpolate(listExitProgress, [0, 1], [1, 0], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}),
					scale: interpolate(popoverProgress, [0, 1], [0.84, 1], {
						extrapolateLeft: "clamp",
						extrapolateRight: "clamp",
						output: "perceptual-scale",
					}),
					translate: "-50% 0px",
				}}
			>
				{PROFILE_DEMO_PAGES.map((profile, index) => {
					const itemProgress = spring({
						frame,
						fps,
						delay: 116 + index * 26,
						config: { damping: 11, mass: 0.3, stiffness: 150 },
					});

					return (
						<div
							key={profile.name}
							className="flex min-h-0 flex-1 w-full items-center gap-5"
							style={{
								opacity: interpolate(itemProgress, [0, 0.5, 1], [0, 1, 1], {
									extrapolateLeft: "clamp",
									extrapolateRight: "clamp",
								}),
								scale: interpolate(itemProgress, [0, 1], [0.84, 1], {
									extrapolateLeft: "clamp",
									extrapolateRight: "clamp",
									output: "perceptual-scale",
								}),
							}}
						>
							<img
								src={profile.image}
								alt=""
								className="size-28 shrink-0 rounded-full object-cover"
							/>
							<span className="min-w-0">
								<span className="block truncate text-3xl font-medium tracking-tight">
									{profile.name}
								</span>
								<span className="block truncate text-2xl text-gray-bright">
									/{profile.handle}
								</span>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function PageviewsDemo() {
	return (
		<Player
			component={PageviewsComposition}
			durationInFrames={300}
			compositionWidth={640}
			compositionHeight={480}
			fps={60}
			autoPlay
			loop
			initiallyMuted
			controls={false}
			clickToPlay={false}
			acknowledgeRemotionLicense
			style={{ height: "100%", width: "100%" }}
		/>
	);
}

function PageviewsComposition() {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const todayIntroProgress = spring({
		frame,
		fps,
		config: { damping: 16, mass: 0.35, stiffness: 170 },
	});
	const cardsExitProgress = spring({
		frame,
		fps,
		delay: 258,
		config: { damping: 14, mass: 0.35, stiffness: 170 },
	});

	return (
		<div className="flex size-full flex-col justify-center gap-4 overflow-hidden rounded-2xl bg-background p-6">
			<div
				className="w-fit self-center whitespace-nowrap rounded-[2rem] bg-black px-8 py-5 text-5xl font-medium tracking-tight text-white"
				style={{
					opacity:
						interpolate(frame, [104, 128], [0, 1], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
							easing: Easing.bezier(0.16, 1, 0.3, 1),
						}) *
						interpolate(cardsExitProgress, [0, 1], [1, 0], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}),
					scale: interpolate(frame, [104, 128], [0.88, 1], {
						extrapolateLeft: "clamp",
						extrapolateRight: "clamp",
						easing: Easing.bezier(0.16, 1, 0.3, 1),
						output: "perceptual-scale",
					}),
					translate: interpolate(frame, [104, 128], ["0px 10px", "0px 0px"], {
						extrapolateLeft: "clamp",
						extrapolateRight: "clamp",
						easing: Easing.bezier(0.16, 1, 0.3, 1),
					}),
				}}
			>
				348 views yesterday
			</div>
			<div
				className="w-fit self-center whitespace-nowrap rounded-[2rem] bg-secondary px-8 py-5 text-5xl font-medium tracking-tight"
				style={{
					opacity:
						interpolate(todayIntroProgress, [0, 0.5, 1], [0, 1, 1], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}) *
						interpolate(cardsExitProgress, [0, 1], [1, 0], {
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						}),
					scale: interpolate(todayIntroProgress, [0, 1], [0.9, 1], {
						extrapolateLeft: "clamp",
						extrapolateRight: "clamp",
						output: "perceptual-scale",
					}),
				}}
			>
				<RollingNumber frame={frame} fps={fps} value={177} /> views today
			</div>
		</div>
	);
}

function RollingNumber({
	frame,
	fps,
	value,
}: {
	frame: number;
	fps: number;
	value: number;
}) {
	const digits = [
		{ key: "hundreds", digit: String(value)[0], delay: 0 },
		{ key: "tens", digit: String(value)[1], delay: 6 },
		{ key: "ones", digit: String(value)[2], delay: 12 },
	];

	return (
		<span className="inline-flex h-[1em] overflow-hidden align-bottom">
			{digits.map(({ key, digit, delay }) => (
				<span
					key={key}
					className="relative inline-block h-[1em] w-[0.62em] overflow-hidden"
				>
					<span
						className="absolute inset-x-0 top-0 flex flex-col items-center"
						style={{
							translate: `0px ${interpolate(
								spring({
									frame,
									fps,
									delay,
									config: { damping: 22, mass: 0.55, stiffness: 95 },
								}),
								[0, 1],
								["0em", `-${digit}em`],
								{
									extrapolateLeft: "clamp",
									extrapolateRight: "clamp",
								},
							)}`,
						}}
					>
						{ROLLING_DIGITS.slice(0, Number(digit) + 1).map((number) => (
							<span key={number} className="block h-[1em] leading-none">
								{number}
							</span>
						))}
					</span>
				</span>
			))}
		</span>
	);
}

function PlanCard({
	name,
	price,
	suffix,
	features,
	action,
}: {
	name: string;
	price: string;
	suffix: string;
	features: PlanFeature[];
	action: ReactNode;
}) {
	return (
		<article
			className={`flex h-125 flex-row gap-8 rounded-3xl bg-[#f6f6f6] overflow-hidden`}
		>
			<div className="flex flex-col h-full flex-1 p-6">
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<h3 className="text-3xl font-medium tracking-tight">{name}</h3>
						<div className="flex items-baseline gap-1.5 text-4xl font-medium">
							<NumberPopIn value={price} />
							<span className="text-gray-bright/60">
								<NumberPopIn value={suffix} />
							</span>
						</div>
					</div>

					<ul className="flex flex-col gap-1 text-lg font-medium">
						{features.map((feature) => {
							return (
								<li key={feature.label} className="flex items-center gap-2">
									<BadgeCheck
										className="size-5 shrink-0 fill-brand stroke-white"
										aria-hidden="true"
									/>
									<span>{feature.label}</span>
								</li>
							);
						})}
					</ul>
				</div>
				<div className="mt-auto">{action}</div>
			</div>
			<aside className="relative hidden flex-1 overflow-hidden md:block">
				<div className="size-150 absolute -bottom-40 -right-40">
					<img
						src={"/favicon.svg"}
						alt="grabbin"
						className="size-full object-cover"
					/>
				</div>
			</aside>
		</article>
	);
}

function BillingPeriodTabs({
	value,
	onChange,
}: {
	value: PlanPeriod;
	onChange: (period: PlanPeriod) => void;
}) {
	const barRef = useRef<HTMLDivElement>(null);
	const previousValue = useRef(value);

	useLayoutEffect(() => {
		moveTabPill(barRef.current, previousValue.current !== value);
		previousValue.current = value;
	}, [value]);

	useLayoutEffect(() => {
		const handleResize = () => moveTabPill(barRef.current, false);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<div
			ref={barRef}
			className="t-tabs"
			role="tablist"
			aria-label="Billing period"
		>
			<span className="t-tabs-pill smooth-shadow-ring-sm" aria-hidden="true" />
			{(Object.keys(PRO_PLANS) as PlanPeriod[]).map((period) => (
				<button
					key={period}
					type="button"
					role="tab"
					aria-selected={value === period}
					onClick={() => onChange(period)}
					className="t-tab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring font-medium focus-visible:smooth-shadow-ring-sm focus-visible:shadow-neutral-700 focus-visible:smooth-ring-neutral-300/30"
				>
					{PRO_PLANS[period].label}
				</button>
			))}
		</div>
	);
}

function moveTabPill(bar: HTMLDivElement | null, animate: boolean) {
	const pill = bar?.querySelector<HTMLElement>(".t-tabs-pill");
	const tab = bar?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
	if (!pill || !tab) return;

	if (!animate) {
		const previousTransition = pill.style.transition;
		pill.style.transition = "none";
		pill.style.transform = `translateX(${tab.offsetLeft}px)`;
		pill.style.width = `${tab.offsetWidth}px`;
		void pill.offsetWidth;
		pill.style.transition = previousTransition;
		return;
	}

	pill.style.transform = `translateX(${tab.offsetLeft}px)`;
	pill.style.width = `${tab.offsetWidth}px`;
}

function NumberPopIn({ value }: { value: string }) {
	const groupRef = useRef<HTMLSpanElement>(null);
	const previousValue = useRef(value);

	useLayoutEffect(() => {
		if (previousValue.current === value) return;
		previousValue.current = value;

		const group = groupRef.current;
		if (!group) return;

		group.classList.remove("is-animating");
		void group.offsetHeight;
		group.classList.add("is-animating");
	}, [value]);

	return (
		<span ref={groupRef} className="t-digit-group">
			{value.split("").map((character, index) => (
				<span
					key={`${value}-${value.slice(0, index)}-${character}`}
					className="t-digit"
					data-stagger={
						index === value.length - 2
							? "1"
							: index === value.length - 1
								? "2"
								: undefined
					}
				>
					{character}
				</span>
			))}
		</span>
	);
}
