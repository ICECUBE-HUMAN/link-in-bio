import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allPosts } from "content-collections";
import { Markdown } from "@/components/post/markdown";
import { createBlogPostingJsonLd } from "@/lib/seo/json-ld";
import {
	createSeo,
	DEFAULT_SITE_NAME,
	DEFAULT_SOCIAL_IMAGE,
	truncateSeoText,
} from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/site/site-url";
import { renderMarkdown } from "@/utils/markdown";

function formatDate(date: Date) {
	return date.toLocaleDateString("en-US", {
		day: "numeric",
		month: "long",
		timeZone: "UTC",
		year: "numeric",
	});
}

export const Route = createFileRoute("/blog/$slug")({
	loader: async ({ params }) => {
		const post = allPosts.find((candidate) => candidate.slug === params.slug);

		if (!post) {
			throw notFound({ routeId: Route.id });
		}

		return {
			post,
			rendered: await renderMarkdown(post.content),
		};
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return createSeo({
				title: "Blog",
				canonicalPath: "/blog",
			});
		}

		const { post } = loaderData;
		const canonicalPath = `/blog/${encodeURIComponent(post.slug)}`;
		const description = truncateSeoText(post.description ?? post.excerpt);

		return createSeo({
			title: post.title,
			description,
			canonicalPath,
			image: post.headerImage ?? DEFAULT_SOCIAL_IMAGE,
			imageAlt: post.title,
			type: "article",
			keywords: [post.category ?? "link in bio", "creator tips"],
			publishedTime: post.published.toISOString(),
			jsonLd: createBlogPostingJsonLd({
				title: post.title,
				description,
				path: canonicalPath,
				publishedTime: post.published.toISOString(),
				image: post.headerImage ?? DEFAULT_SOCIAL_IMAGE,
				authors: post.authors,
				section: post.category,
				publisher: {
					"@type": "Organization",
					name: DEFAULT_SITE_NAME,
					...(getSiteUrl() ? { url: getSiteUrl() } : {}),
				},
			}),
		});
	},
	component: BlogPost,
});

function BlogPost() {
	const { post, rendered } = Route.useLoaderData();

	return (
		<main className="flex flex-col items-center px-5 pt-32 pb-24">
			<article className="w-full max-w-3xl">
				<header className="mb-12 flex flex-col gap-5">
					<Link
						className="text-sm text-muted-foreground transition-colors hover:text-foreground"
						to="/blog"
					>
						← Back to {DEFAULT_SITE_NAME} guides
					</Link>
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<span>{post.category ?? "Guides"}</span>
						<span aria-hidden="true">·</span>
						<time dateTime={post.published.toISOString()}>
							{formatDate(post.published)}
						</time>
					</div>
					<h1 className="text-4xl font-medium leading-tight text-fg-4 sm:text-6xl">
						{post.title}
					</h1>
					<p className="max-w-2xl text-lg leading-8 text-muted-foreground">
						{post.description}
					</p>
				</header>

				<div className="surface-line rounded-3xl px-5 py-8 sm:px-10 sm:py-12">
					<Markdown result={rendered} />
				</div>
			</article>
		</main>
	);
}
