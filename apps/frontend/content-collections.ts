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

function createArticleCollection(name: "posts", directory: string) {
	return defineCollection({
		name,
		directory,
		include: ["**/*.md", "**/*.mdx"],
		schema: markdownDocumentSchema.extend({
			published: z.coerce.date(),
			authors: z.string().array(),
			category: z.string().optional(),
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
}

const postCollection = createArticleCollection("posts", "./src/mdx/post");

export default defineConfig({
	content: [postCollection],
});
