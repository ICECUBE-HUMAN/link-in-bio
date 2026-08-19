import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/layout/shell/footer";
import { Markdown } from "@/components/post/markdown";
import { createSeo } from "@/lib/seo/metadata";
import privacyMarkdown from "@/mdx/privacy/privacy.mdx?raw";
import {
	getMarkdownFrontmatterString,
	parseMarkdownDocument,
	renderMarkdown,
} from "@/utils/markdown";

const privacyDocument = parseMarkdownDocument(privacyMarkdown);
const privacyTitle = getMarkdownFrontmatterString(
	privacyDocument.data,
	"title",
);
const privacyDescription = getMarkdownFrontmatterString(
	privacyDocument.data,
	"description",
);
const privacyLastUpdated = getMarkdownFrontmatterString(
	privacyDocument.data,
	"lastUpdated",
);

export const Route = createFileRoute("/privacy")({
	staticData: {
		footer: {
			label: "Privacy",
			order: 30,
		},
	},
	head: () =>
		createSeo({
			title: privacyTitle,
			description: privacyDescription,
			canonicalPath: "/privacy",
		}),
	loader: async () => ({
		title: privacyTitle,
		description: privacyDescription,
		lastUpdated: privacyLastUpdated,
		rendered: await renderMarkdown(privacyDocument.content),
	}),
	component: Privacy,
});

function Privacy() {
	const { title, description, lastUpdated, rendered } = Route.useLoaderData();

	return (
		<main className="legal-document flex flex-col items-center px-5 pt-40 pb-24">
			<article className="w-full max-w-xl px-5">
				<header className="flex flex-col items-center text-center">
					<h1 className="text-4xl leading-10 font-medium tracking-[-0.04em] text-foreground">
						{title}
					</h1>
					<p className="mt-4 max-w-sm text-center text-sm leading-5 text-muted-foreground">
						{description}
					</p>
					<time className="mt-4 inline-flex h-7 items-center rounded-md bg-muted px-2.5 text-sm leading-5 text-muted-foreground">
						Last updated {lastUpdated}
					</time>
				</header>
				<Markdown result={rendered} className="legal-markdown mt-16" />
			</article>
			<div className="w-full">
				<Footer />
			</div>
		</main>
	);
}
