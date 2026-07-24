"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SlidingNumber } from "@/components/ui/sliding-number";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type BillingPeriod,
	getPrice,
	getPricingTier,
	PRICING_FEATURES,
	PRICING_TIERS,
} from "@/constant/pricing";

export function PricingCard() {
	const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
	const [tierIndex, setTierIndex] = useState(0);

	const tier = getPricingTier(tierIndex);
	const price = getPrice(tierIndex, billingPeriod);
	const eventValue =
		tier.events >= 1_000_000 ? tier.events / 1_000_000 : tier.events / 1_000;
	const eventUnit = tier.events >= 1_000_000 ? "M" : "k";

	return (
		<div className="w-full h-[80vh] max-w-5xl flex flex-col items-center gap-8">
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
			<div className="flex flex-col gap-10 rounded-[2rem] w-md bg-secondary/80 p-6 sm:p-8 lg:p-8">
				<div className="flex flex-col gap-8 ">
					<div className="flex flex-col gap-3">
						<div className="flex items-end justify-between">
							<span className="flex items-end text-5xl font-semibold">
								<SlidingNumber value={eventValue} />
								<span>{eventUnit}</span>
							</span>
							<div className="flex items-end gap-0.5">
								<span className="text-2xl font-medium tracking-tight flex flex-row items-center">
									<span>$</span>
									<SlidingNumber value={price} />
								</span>
								<span className="text-2xl text-gray-bright">
									/{billingPeriod === "monthly" ? "mo" : "yr"}
								</span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-4">
						<Slider
							min={0}
							max={PRICING_TIERS.length - 1}
							step={1}
							value={tierIndex}
							onValueChange={(value) => setTierIndex(value)}
							className={""}
						/>
					</div>

					<Button
						size="lg"
						className="h-12 w-full rounded-xl font-medium text-base sm:px-6"
					>
						Start 14 day free trial
					</Button>
				</div>

				<ul className="">
					{PRICING_FEATURES.map((feature) => (
						<li key={feature} className="flex items-center gap-3 py-1">
							<span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary">
								<CheckIcon className="size-4" />
							</span>
							<span className="text-sm font-normal">{feature}</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
