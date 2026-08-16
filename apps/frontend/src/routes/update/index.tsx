import { createFileRoute } from "@tanstack/react-router";
import { allUpdates } from "content-collections";
import { Markdown } from "@/components/post/markdown";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import {
	createSeo,
	DEFAULT_SITE_NAME,
	DEFAULT_SOCIAL_IMAGE,
} from "@/lib/seo/metadata";
import { renderMarkdown } from "@/utils/markdown";

export const Route = createFileRoute("/update/")({
	loader: async () => {
		const updates = [...allUpdates].sort(
			(a, b) => b.published.getTime() - a.published.getTime(),
		);

		return {
			updates: await Promise.all(
				updates.map(async (update) => ({
					...update,
					rendered: await renderMarkdown(update.content),
				})),
			),
		};
	},
	staticData: {
		footer: {
			label: "Update",
			order: 50,
		},
	},
	head: () =>
		createSeo({
			title: "Product updates",
			description:
				"Product updates and technical notes from the team building Grabbin.",
			canonicalPath: "/update",
			image: DEFAULT_SOCIAL_IMAGE,
			imageAlt: `${DEFAULT_SITE_NAME} product updates preview`,
			keywords: ["Grabbin updates", "link in bio updates", "product notes"],
			jsonLd: createWebPageJsonLd({
				title: "Product updates",
				description:
					"Product updates and technical notes from the team building Grabbin.",
				path: "/update",
			}),
		}),
	component: UpdatePage,
});

function formatDate(date: Date) {
	return date.toLocaleDateString("en-US", {
		day: "numeric",
		month: "long",
		timeZone: "UTC",
		year: "numeric",
	});
}

function UpdatePage() {
	const { updates } = Route.useLoaderData();

	return (
		<main className="flex flex-col items-center px-5 pt-32 pb-24">
			<header className="flex w-full max-w-3xl flex-col gap-4 pb-12">
				<p className="text-sm text-muted-foreground">
					{DEFAULT_SITE_NAME} updates
				</p>
				<h1 className="text-4xl font-medium text-fg-4 sm:text-6xl">
					Product updates
				</h1>
				<p className="max-w-2xl text-base leading-7 text-muted-foreground">
					Product updates and technical notes from the team building Grabbin.
				</p>
			</header>

			<section className="flex w-full max-w-3xl flex-col gap-10">
				{updates.map((update) => (
					<article
						className="surface-line rounded-3xl p-6 sm:p-10"
						key={update.slug}
					>
						<header className="mb-8 flex flex-col gap-4">
							<div className="flex items-center gap-3 text-sm text-muted-foreground">
								<span>{update.category ?? "Updates"}</span>
								<span aria-hidden="true">·</span>
								<time dateTime={update.published.toISOString()}>
									{formatDate(update.published)}
								</time>
							</div>
							<h2 className="text-3xl font-medium leading-tight text-fg-4">
								{update.title}
							</h2>
							<p className="text-base leading-7 text-muted-foreground">
								{update.description}
							</p>
						</header>
						<Markdown result={update.rendered} />
					</article>
				))}
			</section>
		</main>
	);
}
