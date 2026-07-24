import { createFileRoute, notFound } from "@tanstack/react-router";
import { allPosts } from "content-collections";
import { Markdown } from "@/components/post/markdown";
import {
	createBlogPostingJsonLd,
	createOrganizationJsonLd,
} from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";
import { renderMarkdown } from "@/utils/markdown";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

export const Route = createFileRoute("/_header/blog/$slug")({
	loader: async ({ params }) => {
		const post = allPosts.find((p) => p.slug === params.slug);
		if (!post) {
			throw notFound();
		}
		return {
			post,
			markdown: await renderMarkdown(post.content),
		};
	},
	head: ({ loaderData }) =>
		createSeo({
			title: loaderData?.post.title,
			description: loaderData?.post.description,
			canonicalPath: loaderData ? `/blog/${loaderData.post.slug}` : undefined,
			image: loaderData?.post.headerImage,
			type: "article",
			publishedTime: loaderData?.post.published.toISOString(),
			modifiedTime: loaderData?.post.published.toISOString(),
			jsonLd: loaderData
				? createBlogPostingJsonLd({
						title: loaderData.post.title,
						description: loaderData.post.description,
						path: `/blog/${loaderData.post.slug}`,
						publishedTime: loaderData.post.published.toISOString(),
						modifiedTime: loaderData.post.published.toISOString(),
						image: loaderData.post.headerImage,
						authors: loaderData.post.authors,
						publisher: createOrganizationJsonLd(),
					})
				: undefined,
		}),
	component: BlogPost,
});

function BlogPost() {
	const { post, markdown } = Route.useLoaderData();

	return (
		<main className="mx-auto">
			<article className="px-4">
				<header className="flex flex-col items-center gap-6 pt-40 pb-20">
					<div className="flex flex-col items-center gap-4 pb-8">
						<p className="text-sm text-muted-foreground">
							{dateFormatter.format(post.published)}
						</p>
						<div className="flex flex-col gap-2 items-center">
							<h1 className="font-bold text-4xl">{post.title}</h1>
							<h2 className="font-medium text-muted-foreground/80 text-center">
								{post.description}
							</h2>
						</div>
					</div>
					<div className="w-full max-w-5xl mx-auto">
						{post.headerImage ? (
							<img
								src={post.headerImage}
								alt={post.title}
								className="w-full rounded-4xl border"
							/>
						) : null}
					</div>
				</header>
				<Markdown
					result={markdown}
					className="mx-auto max-w-xl prose w-full break-all"
				/>
			</article>
		</main>
	);
}
