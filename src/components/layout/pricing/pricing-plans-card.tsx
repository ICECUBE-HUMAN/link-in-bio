"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SlidingNumber } from "@/components/ui/sliding-number";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/shared/utils";
import {
	type BillingPeriod,
	formatEventCount,
	PLAN_CONFIG,
	PRICING_TIERS,
} from "@/constant/pricing";

function getPlanPrice(
	plan: keyof typeof PLAN_CONFIG,
	tierIndex: number,
	billingPeriod: BillingPeriod,
) {
	const config = PLAN_CONFIG[plan];
	const monthlyPrice = config.basePrice + config.priceStep * tierIndex;

	if (billingPeriod === "monthly") {
		return monthlyPrice;
	}

	return monthlyPrice * 10;
}

function renderFeature(feature: string, tierIndex: number) {
	if (feature === "monthly-events") {
		return `${formatEventCount(PRICING_TIERS[tierIndex]?.events ?? PRICING_TIERS[0].events)} monthly events`;
	}

	return feature;
}

function PlanCard({
	plan,
	tierIndex,
	billingPeriod,
}: {
	plan: keyof typeof PLAN_CONFIG;
	tierIndex: number;
	billingPeriod: BillingPeriod;
}) {
	const config = PLAN_CONFIG[plan];
	const price = getPlanPrice(plan, tierIndex, billingPeriod);
	const tier = PRICING_TIERS[tierIndex] ?? PRICING_TIERS[0];
	const eventValue =
		tier.events >= 1_000_000 ? tier.events / 1_000_000 : tier.events / 1_000;
	const eventUnit = tier.events >= 1_000_000 ? "M" : "k";

	return (
		<article
			className={cn(
				"w-md",
				plan === "pro"
					? "rounded-[2rem] bg-background/40 p-6 sm:p-8 border"
					: "rounded-[2rem] bg-secondary/80 p-6 sm:p-8",
			)}
		>
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-3">
						<h3 className="text-2xl font-semibold">{config.name}</h3>
						{plan === "starter" ? (
							<span className="rounded-lg bg-primary px-3 py-1 text-xs font-normal text-primary-foreground">
								Popular
							</span>
						) : null}
					</div>
					<p className="text-sm text-gray-bright">{config.description}</p>
				</div>

				<div className="flex items-end justify-between gap-3">
					<span className="flex items-end text-5xl font-semibold">
						<SlidingNumber value={eventValue} />
						<span>{eventUnit}</span>
					</span>
					<div className="flex items-end gap-0.5">
						<span className="flex flex-row items-center text-2xl font-medium tracking-tight">
							<span>$</span>
							<SlidingNumber value={price} />
						</span>
						<span className="text-2xl text-gray-bright">
							/{billingPeriod === "monthly" ? "mo" : "yr"}
						</span>
					</div>
				</div>

				<Button
					size="lg"
					variant={plan === "pro" ? "secondary" : "default"}
					className="mt-2 h-12 rounded-xl font-medium text-base"
				>
					{config.ctaLabel}
				</Button>

				<ul className="grid gap-3">
					{config.features.map((feature) => (
						<li key={feature} className="flex items-center gap-3 text-sm">
							<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
								<CheckIcon className="size-3.5" />
							</span>
							<span>{renderFeature(feature, tierIndex)}</span>
						</li>
					))}
				</ul>
			</div>
		</article>
	);
}

export function PricingPlansCard() {
	const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
	const [tierIndex, setTierIndex] = useState(0);
	const currentTier = PRICING_TIERS[tierIndex] ?? PRICING_TIERS[0];

	return (
		<div className="w-full max-w-5xl flex flex-col items-center gap-8">
			<div className="flex flex-col-reverse items-center lg:flex-row max-w-3xl w-full gap-6">
				<div className="flex flex-col gap-4 w-full">
					<div className="flex items-center justify-between gap-4 text-sm font-medium text-white">
						<span>Monthly events</span>
						<span>{formatEventCount(currentTier.events)}</span>
					</div>
					<Slider
						min={0}
						max={PRICING_TIERS.length - 1}
						step={1}
						value={tierIndex}
						onValueChange={(value) => setTierIndex(value)}
						className={"basis-full"}
					/>
					<div className="flex justify-between gap-2 text-xs text-gray-bright">
						<span>{formatEventCount(PRICING_TIERS[0].events)}</span>
						<span>{formatEventCount(PRICING_TIERS.at(-1)?.events ?? 0)}</span>
					</div>
				</div>

				<Tabs
					value={billingPeriod}
					onValueChange={(value) => setBillingPeriod(value as BillingPeriod)}
					className="gap-4"
				>
					<TabsList className="rounded-full p-1 [&_[data-slot=tab-indicator]]:rounded-full [&_[data-slot=tabs-tab]]:rounded-full">
						<TabsTrigger className="px-4 font-normal" value="monthly">
							Monthly
						</TabsTrigger>
						<TabsTrigger className="px-4 font-normal" value="yearly">
							Yearly
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			<div className="flex flex-col gap-8">
				<div className="flex flex-col gap-6 lg:flex-row">
					<PlanCard
						plan="starter"
						tierIndex={tierIndex}
						billingPeriod={billingPeriod}
					/>
					<PlanCard
						plan="pro"
						tierIndex={tierIndex}
						billingPeriod={billingPeriod}
					/>
				</div>
			</div>
		</div>
	);
}
