// src/routes/blog.index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";

export const Route = createFileRoute("/update/")({
	staticData: {
		header: {
			label: "Update",
			order: 30,
		},
		footer: {
			label: "Update",
			order: 20,
		},
	},
	head: () =>
		createSeo({
			title: "Update",
			description: "Updates and insights from Service",
			canonicalPath: "/update",
			jsonLd: createWebPageJsonLd({
				title: "Update",
				description: "Updates and insights from Service",
				path: "/update",
			}),
		}),
	component: BlogIndex,
});

function BlogIndex() {
	return (
		<main className="flex flex-col items-center pb-32">
			<header className="flex w-full flex-col items-center justify-center gap-4 pt-40 pb-16">
				<h1 className="text-4xl font-medium text-fg-4 leading-tighter text-center">
					Blog
				</h1>
				<p className="max-w-sm text-center text-sm text-muted-foreground">
					Updates and insights from {DEFAULT_SITE_NAME}
				</p>
			</header>

			<section className="w-full max-w-5xl mx-auto px-4">
				{/* MDX Content */}
			</section>
		</main>
	);
}
