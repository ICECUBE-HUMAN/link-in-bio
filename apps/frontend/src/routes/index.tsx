import { createFileRoute } from "@tanstack/react-router";
import { createSeo } from "@/lib/seo/metadata";

import CTASection from "@/components/layout/sections/cta-section";
import HeroSection from "@/components/layout/sections/hero-section";
import MessageSection from "@/components/layout/sections/message-section";
import FeatureSection from "@/components/layout/sections/feature-section";

import { Footer } from "@/components/layout/shell/footer";


export const Route = createFileRoute("/")({
	staticData: {
		footer: {
			label: "Home",
			order: 10,
		},
	},
	head: () => createSeo({}),
	component: Home,
});

function Home() {
	return (
		<main>
			<div className="flex min-h-lvh flex-col">
				<section className="flex-1 px-5 pb-16">
          <HeroSection />
          <FeatureSection />
					<MessageSection />
					<CTASection />
				</section>
      </div>
      <div className="px-5">
        <Footer />
      </div>
		</main>
	);
}
