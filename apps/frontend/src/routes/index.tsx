import { createFileRoute } from "@tanstack/react-router";
import CTASection from "@/components/layout/sections/cta-section";
import HeroSection from "@/components/layout/sections/hero-section";
import { Footer } from "@/components/layout/shell/footer";
import { createSeo } from "@/lib/seo/metadata";

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
					<CTASection />
				</section>
			</div>
			<Footer />
		</main>
	);
}
