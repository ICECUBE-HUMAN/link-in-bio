import { createFileRoute } from "@tanstack/react-router";
import {
	createWebPageJsonLd,
	createWebSiteJsonLd,
} from "@/lib/seo/json-ld";
import {
	createSeo,
	DEFAULT_SEO_DESCRIPTION,
	DEFAULT_SITE_NAME,
	DEFAULT_SOCIAL_IMAGE,
} from "@/lib/seo/metadata";

import CTASection from "@/components/layout/sections/cta-section";
import HeroSection from "@/components/layout/sections/hero-section";
import FeatureSection from "@/components/layout/sections/feature-section";

import { Footer } from "@/components/layout/shell/footer";


const HOME_TITLE = "A Link in Bio, the most beautiful and clean you've ever seen";
const HOME_KEYWORDS = [
	"link in bio",
	"personal page",
	"creator page",
	"social links",
	"online profile",
];

export const Route = createFileRoute("/")({
	staticData: {
		footer: {
			label: "Home",
			order: 10,
		},
	},
	head: () =>
		createSeo({
			title: HOME_TITLE,
			description: DEFAULT_SEO_DESCRIPTION,
			canonicalPath: "/",
			image: DEFAULT_SOCIAL_IMAGE,
			imageAlt: `${DEFAULT_SITE_NAME} preview`,
			keywords: HOME_KEYWORDS,
			jsonLd: [
				createWebSiteJsonLd({
					name: DEFAULT_SITE_NAME,
					description: DEFAULT_SEO_DESCRIPTION,
					path: "/",
				}),
				createWebPageJsonLd({
					title: HOME_TITLE,
					description: DEFAULT_SEO_DESCRIPTION,
					path: "/",
				}),
			],
		}),
	component: Home,
});

function Home() {
	return (
		<main>
			<div className="flex min-h-lvh flex-col">
				<section className="flex-1 px-5 pb-16">
          <HeroSection />
          <FeatureSection />
					{/*<MessageSection />*/}
					<CTASection />
				</section>
      </div>
      <div className="px-5">
        <Footer />
      </div>
		</main>
	);
}
