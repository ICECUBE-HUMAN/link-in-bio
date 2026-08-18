import { createFileRoute } from "@tanstack/react-router";
import FeatureSection from "@/components/layout/sections/feature-section";
import PlanSection from "@/components/layout/sections/plan-section";
import { Footer } from "@/components/layout/shell/footer";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import {
	createSeo,
	DEFAULT_SITE_NAME,
	DEFAULT_SOCIAL_IMAGE,
} from "@/lib/seo/metadata";

const PRICING_TITLE = `Simple ${DEFAULT_SITE_NAME} plans for creators`;
const PRICING_DESCRIPTION =
	"Compare simple plans for creating a beautiful link in bio page with your links, media, and favorite places.";

export const Route = createFileRoute("/pricing/")({
	head: () =>
		createSeo({
			title: PRICING_TITLE,
			description: PRICING_DESCRIPTION,
			canonicalPath: "/pricing",
			image: DEFAULT_SOCIAL_IMAGE,
			imageAlt: `${DEFAULT_SITE_NAME} plans preview`,
			keywords: ["link in bio pricing", "creator page", "personal page"],
			jsonLd: createWebPageJsonLd({
				title: PRICING_TITLE,
				description: PRICING_DESCRIPTION,
				path: "/pricing",
			}),
		}),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<main className="px-5 pb-16">
				<PlanSection />
				<FeatureSection />
			</main>
			<div className="px-5">
				<Footer />
			</div>
		</>
	);
}
