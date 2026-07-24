import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/layout/pages/home-page";
import {
	createOrganizationJsonLd,
	createWebPageJsonLd,
	createWebSiteJsonLd,
} from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

export const Route = createFileRoute("/")({
	staticData: {
		footer: {
			label: "Home",
			order: 10,
		},
	},
	head: () =>
		createSeo({
			title: "Home",
			description:
				"A TanStack Start starter with composable SEO metadata and JSON-LD.",
			canonicalPath: "/",
			jsonLd: [
				createWebSiteJsonLd({
					description:
						"A TanStack Start starter with composable SEO metadata and JSON-LD.",
					path: "/",
				}),
				createWebPageJsonLd({
					title: "Home",
					description:
						"A TanStack Start starter with composable SEO metadata and JSON-LD.",
					path: "/",
				}),
				createOrganizationJsonLd({
					description:
						"A TanStack Start starter with composable SEO metadata and JSON-LD.",
				}),
			],
		}),
	component: Home,
});

function Home() {
	return <HomePage />;
}
