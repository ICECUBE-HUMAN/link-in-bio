import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/layout/shell/footer";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

const EXPLORE_DESCRIPTION =
	"Explore a few focused starting points for privacy-first analytics, conversion tracking, and lightweight reporting.";

export const Route = createFileRoute("/explore/")({
	staticData: {
		footer: {
			label: "Explore",
			order: 50,
		},
	},
	head: () =>
		createSeo({
			title: "Explore",
			description: EXPLORE_DESCRIPTION,
			canonicalPath: "/explore",
			noIndex: true,
			jsonLd: createWebPageJsonLd({
				title: "Explore",
				description: EXPLORE_DESCRIPTION,
				path: "/explore",
			}),
		}),
	component: ExplorePage,
});

function ExplorePage() {
	return (
		<>
			<main className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-5 py-20">
				<section className="flex max-w-2xl flex-col gap-5">
					<div className="space-y-4">
						{/*<h1 className="text-3xl font-bold text-balance md:text-4xl">
							Explore
						</h1>*/}
						<p className="max-w-xl font-medium text-base text-gray-bright">
							Explore how other users have built their pages. This space isn’t
							available yet, but we’ll build it if you want it.
						</p>
					</div>
				</section>
			</main>
			<div className="px-5">
				<Footer />
			</div>
		</>
	);
}
