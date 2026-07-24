import { createFileRoute } from "@tanstack/react-router";
import { PricingCard } from "@/components/layout/pricing/pricing-card";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

const PRICING_DESCRIPTION =
	"Compare Visitors pricing and choose the plan that fits your website analytics needs, from getting started to scaling privacy-first insights.";

export const Route = createFileRoute("/_header/pricing/")({
	staticData: {
		header: {
			label: "Pricing",
			order: 10,
		},
		footer: {
			label: "Pricing",
			order: 20,
		},
	},
	head: () =>
		createSeo({
			title: "Pricing",
			description: PRICING_DESCRIPTION,
			canonicalPath: "/pricing",
			jsonLd: createWebPageJsonLd({
				title: "Pricing",
				description: PRICING_DESCRIPTION,
				path: "/pricing",
			}),
		}),
	component: PricingPage,
});

function PricingPage() {
	return (
		<main className="mx-auto flex max-w-xl flex-col gap-20 px-5 py-20 pt-52">
			<header className="flex flex-col items-center gap-4 text-center">
				<h1 className="font-bold text-5xl">Design like a Pro.</h1>
				<p className="text-gray-bright">
					Get full access to all apps & features from only ₩460.27 per day —
					Cancel anytime.
				</p>
			</header>

			<PricingCard />
		</main>
	);
}
