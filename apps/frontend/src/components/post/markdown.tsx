import htmlToDOM from "html-dom-parser/lib/server/html-to-dom";
import {
	domToReact,
	Element,
	type DOMNode,
	type HTMLReactParserOptions,
} from "html-react-parser";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/shared/utils";
import type { MarkdownResult } from "@/utils/markdown";

type MarkdownProps = {
	result: MarkdownResult;
	className?: string;
};

export function Markdown({ result, className }: MarkdownProps) {
	const options: HTMLReactParserOptions = {
		replace: (domNode) => {
			if (domNode instanceof Element) {
				if (domNode.name === "a") {
					const href = domNode.attribs.href;
					if (href?.startsWith("/")) {
						return (
							<Link to={href}>
								{domToReact(domNode.children as DOMNode[], options)}
							</Link>
						);
					}
				}

				if (domNode.name === "img") {
					return <img {...domNode.attribs} alt={domNode.attribs.alt ?? ""} />;
				}
			}
		},
	};

	return (
		<div className={cn("pb-20", className)}>
			{domToReact(htmlToDOM(result.markup), options)}
		</div>
	);
}
