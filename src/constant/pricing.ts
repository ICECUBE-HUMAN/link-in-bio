export const PRICING_FEATURES = [
	"Unlimited websites",
	"Realtime analytics",
	"GDPR compliant",
	"Performance insights",
	"Forever retention",
	"Revenue tracking",
	"Visitor profiles",
	"Custom events",
	"Funnel analysis",
	"Superior support",
] as const;

export const PRICING_TIERS = [
	{ events: 10_000, monthly: 9 },
	{ events: 25_000, monthly: 19 },
	{ events: 50_000, monthly: 39 },
	{ events: 100_000, monthly: 79 },
	{ events: 250_000, monthly: 149 },
	{ events: 500_000, monthly: 249 },
	{ events: 1_000_000, monthly: 399 },
] as const;

export const PLAN_CONFIG = {
	starter: {
		name: "Starter",
		description: "For a single site getting started.",
		basePrice: 9,
		priceStep: 8,
		ctaLabel: "Start 14 day free trial",
		features: [
			"1 website",
			"monthly-events",
			"Realtime analytics",
			"GDPR compliant",
			"Performance insights",
			"30 day retention",
			"Email support",
		],
	},
	pro: {
		name: "Pro",
		description: "For teams running multiple properties.",
		basePrice: 29,
		priceStep: 20,
		ctaLabel: "Start 14 day free trial",
		features: [
			"Unlimited websites",
			"monthly-events",
			"Revenue tracking",
			"Visitor profiles",
			"Custom events",
			"Funnel analysis",
			"Forever retention",
			"Superior support",
		],
	},
} as const;

export type BillingPeriod = "monthly" | "yearly";

export function getPricingTier(index: number) {
	return PRICING_TIERS[index] ?? PRICING_TIERS[0];
}

export function getPrice(index: number, period: BillingPeriod) {
	const tier = getPricingTier(index);

	if (period === "monthly") {
		return tier.monthly;
	}

	return tier.monthly * 10;
}

export function formatEventCount(value: number) {
	if (value >= 1_000_000) {
		return `${value / 1_000_000}M`;
	}

	return `${value / 1_000}k`;
}
