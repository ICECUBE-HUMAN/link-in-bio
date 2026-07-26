import { defineCollection, defineConfig } from "@content-collections/core";
import matter from "gray-matter";
import z from "zod";

function extractFrontMatter(content: string) {
	const { content: body, excerpt } = matter(content, { excerpt: true });
	return { body, excerpt: excerpt || "" };
}

const markdownDocumentSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	image: z.string().optional(),
});

const postCollection = defineCollection({
	name: "posts",
	directory: "./src/mdx/post",
	include: "**/*.md",
	schema: markdownDocumentSchema.extend({
		published: z.coerce.date(),
		authors: z.string().array(),
		content: z.string(),
	}),
	transform: ({ content, ...post }) => {
		const frontMatter = extractFrontMatter(content);
		const headerImageMatch = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
		const headerImage = headerImageMatch ? headerImageMatch[2] : undefined;

		return {
			...post,
			slug: post._meta.path,
			excerpt: frontMatter.excerpt,
			headerImage: post.image ?? headerImage,
			content: frontMatter.body,
		};
	},
});

function createStaticPageCollection(name: "privacyPages" | "termsPages", directory: string) {
	return defineCollection({
		name,
		directory,
		include: "**/*.md",
		schema: markdownDocumentSchema.extend({
			updated: z.coerce.date(),
			content: z.string(),
		}),
		transform: ({ content, ...page }) => {
			const frontMatter = extractFrontMatter(content);

			return {
				...page,
				slug: page._meta.path,
				excerpt: frontMatter.excerpt,
				content: frontMatter.body,
			};
		},
	});
}

const privacyPageCollection = createStaticPageCollection(
	"privacyPages",
	"./src/mdx/privacy",
);

const termsPageCollection = createStaticPageCollection(
	"termsPages",
	"./src/mdx/terms",
);

export default defineConfig({
	content: [postCollection, privacyPageCollection, termsPageCollection],
});
