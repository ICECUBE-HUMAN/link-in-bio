// src/routes/blog.index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { allPosts } from "content-collections";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

export const Route = createFileRoute("/_header/blog/")({
	staticData: {
		header: {
			label: "Blog",
			order: 30,
		},
		footer: {
			label: "Blog",
			order: 20,
		},
	},
	head: () =>
		createSeo({
			title: "Blog",
			description: "Updates and insights from Service",
			canonicalPath: "/blog",
			jsonLd: createWebPageJsonLd({
				title: "Blog",
				description: "Updates and insights from Service",
				path: "/blog",
			}),
		}),
	component: BlogIndex,
});

function BlogIndex() {
	// Posts are sorted by published date
	const sortedPosts = allPosts.toSorted(
		(a, b) => new Date(b.published).getTime() - new Date(a.published).getTime(),
	);
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
				<ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
					{sortedPosts.map((post) => (
						<li key={post.slug} className="min-w-0">
							<Item
								className="flex h-full flex-col items-start gap-2 rounded-4xl p-0 hover:bg-transparent!"
								render={
									<Link
										to="/blog/$slug"
										params={{ slug: post.slug }}
										className="block h-full"
									>
										<span className="w-full text-sm text-muted-foreground/80 text-right">
											{dateFormatter.format(post.published)}
										</span>
										<ItemMedia className="aspect-video w-full overflow-hidden rounded-2xl border">
											{post.headerImage ? (
												<img
													src={post.headerImage}
													alt={post.title}
													className="h-full w-full object-cover"
												/>
											) : (
												<div className="h-full w-full bg-secondary" />
											)}
										</ItemMedia>
										<ItemContent className="gap-2 mt-2">
											<ItemTitle className="line-clamp-2 w-full text-base leading-snug font-normal break-all">
												{post.title}
											</ItemTitle>
											<ItemDescription className="text-sm line-clamp-3 text-muted-foreground/80 font-light break-all">
												{post.description}
											</ItemDescription>
										</ItemContent>
									</Link>
								}
							/>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
