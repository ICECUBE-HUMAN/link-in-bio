import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/layout/pages/home-page";
import { createSeo } from "@/lib/seo/metadata";

export const Route = createFileRoute("/demo")({
	head: () =>
		createSeo({
			title: "Demo",
			description:
				"A TanStack Start starter with composable SEO metadata and JSON-LD.",
			canonicalPath: "/demo",
		}),
	component: DemoRoute,
});

function DemoRoute() {
	return <HomePage demoOpen />;
}
