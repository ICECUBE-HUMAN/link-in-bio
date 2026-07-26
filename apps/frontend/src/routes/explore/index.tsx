import { createFileRoute } from "@tanstack/react-router";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

const EXPLORE_DESCRIPTION =
	"Explore a few focused starting points for privacy-first analytics, conversion tracking, and lightweight reporting.";

export const Route = createFileRoute("/explore/")({
	staticData: {
		header: {
			label: "Explore",
			order: 20,
		},
		footer: {
			label: "Explore",
			order: 15,
		},
	},
	head: () =>
		createSeo({
			title: "Explore",
			description: EXPLORE_DESCRIPTION,
			canonicalPath: "/explore",
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
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-5 py-20 pt-52">
			<section className="flex max-w-2xl flex-col gap-5">
				<div className="space-y-4">
					<h1 className="text-3xl font-bold text-balance md:text-4xl">
						Explore
					</h1>
					<p className="max-w-xl text-base text-muted-foreground">
						This page is used to display a list of users or unique pages created
						by users, such as in a link-in-bio service.
					</p>
				</div>
			</section>
		</main>
	);
}
