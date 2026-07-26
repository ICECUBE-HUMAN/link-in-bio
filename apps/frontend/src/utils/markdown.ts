import type { Element } from "hast";
import { toString as toText } from "hast-util-to-string";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export type MarkdownHeading = {
	id: string;
	text: string;
	level: number;
};

export type MarkdownResult = {
	markup: string;
	headings: Array<MarkdownHeading>;
};

const headingSizeClassNames: Record<string, string> = {
	h1: "text-[24px]",
	h2: "text-[20px]",
	h3: "text-[16px]",
	h4: "text-[14px]",
	h5: "text-[13px]",
	h6: "text-[12px]",
};

export async function renderMarkdown(content: string): Promise<MarkdownResult> {
	const headings: Array<MarkdownHeading> = [];

	const result = await unified()
		.use(remarkParse) // Parse markdown
		.use(remarkGfm) // Support GitHub Flavored Markdown
		.use(remarkRehype, { allowDangerousHtml: true }) // Convert to HTML AST
		.use(rehypeRaw) // Process raw HTML in markdown
		.use(rehypeSlug) // Add IDs to headings
		.use(rehypeAutolinkHeadings, {
			behavior: "wrap",
			properties: { className: ["anchor no-underline font-bold"] },
		})
		.use(() => (tree) => {
			visit(tree, "element", (node: Element) => {
				if (node.tagName === "p") {
					node.properties = node.properties ?? {};
					node.properties.className = [
						...(Array.isArray(node.properties.className)
							? node.properties.className
							: []),
						"mt-4! mb-0! leading-6",
						"text-muted-foreground",
					];
				}

				const headingSizeClassName = headingSizeClassNames[node.tagName];

				if (headingSizeClassName) {
					node.properties = node.properties ?? {};
					node.properties.className = [
						...(Array.isArray(node.properties.className)
							? node.properties.className
							: []),
						headingSizeClassName,
					];

					headings.push({
						id: String(node.properties?.id ?? ""),
						text: toText(node),
						level: parseInt(node.tagName.charAt(1), 10),
					});
				}
			});
		})
		.use(rehypeStringify) // Serialize to HTML string
		.process(content);

	return {
		markup: String(result),
		headings,
	};
}
