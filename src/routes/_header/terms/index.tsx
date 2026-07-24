import { createFileRoute, notFound } from "@tanstack/react-router";
import { allTermsPages } from "content-collections";
import { Markdown } from "@/components/post/markdown";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";
import { renderMarkdown } from "@/utils/markdown";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

export const Route = createFileRoute("/_header/terms/")({
	staticData: {
		footer: {
			label: "Terms",
			order: 100,
		},
	},
	loader: async () => {
		const page = allTermsPages.find((item) => item.slug === "index");
		if (!page) {
			throw notFound();
		}

		return {
			page,
			markdown: await renderMarkdown(page.content),
		};
	},
	head: ({ loaderData }) =>
		createSeo({
			title: loaderData?.page.title ?? "Terms of Service",
			description: loaderData?.page.description,
			canonicalPath: "/terms",
			modifiedTime: loaderData?.page.updated.toISOString(),
			jsonLd: createWebPageJsonLd({
				title: loaderData?.page.title ?? "Terms of Service",
				description: loaderData?.page.description,
				path: "/terms",
			}),
		}),
	component: TermsPage,
});

function TermsPage() {
	const { page, markdown } = Route.useLoaderData();

	return (
		<main className="mx-auto max-w-xl px-4 py-20 pt-52">
			<header className="flex flex-col gap-6 pb-8">
				<div className="flex flex-col gap-2">
					<p className="text-sm">
						Updated {dateFormatter.format(page.updated)}
					</p>
					<h1 className="font-bold text-4xl">{page.title}</h1>
				</div>
			</header>
			<Markdown result={markdown} className="prose w-full break-all" />
		</main>
	);
}
