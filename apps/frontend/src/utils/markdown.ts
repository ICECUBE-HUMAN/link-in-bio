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

export type MarkdownDocument = {
	content: string;
	data: Record<string, unknown>;
};

export function parseMarkdownDocument(source: string): MarkdownDocument {
	const frontmatterMatch = source.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
	if (!frontmatterMatch) {
		return { content: source, data: {} };
	}

	const data = Object.fromEntries(
		frontmatterMatch[1].split("\n").flatMap((line) => {
			const separatorIndex = line.indexOf(":");
			if (separatorIndex < 0) return [];

			const key = line.slice(0, separatorIndex).trim();
			const value = line.slice(separatorIndex + 1).trim();
			if (!key || !value) return [];

			return [[key, value.replace(/^(['"])(.*)\1$/, "$2")]];
		}),
	);

	return {
		content: source.slice(frontmatterMatch[0].length),
		data,
	};
}

export function getMarkdownFrontmatterString(
	data: Record<string, unknown>,
	key: string,
): string {
	const value = data[key];

	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`Missing markdown frontmatter field: ${key}`);
	}

	return value.trim();
}

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
				if (node.tagName === "img") {
					node.properties = {
						...node.properties,
						className: ["rounded-4xl"],
						loading: "lazy",
					};
				}

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
