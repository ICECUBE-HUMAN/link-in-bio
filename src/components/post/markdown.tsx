import { Link } from "@tanstack/react-router";
import parse, {
	domToReact,
	Element,
	type HTMLReactParserOptions,
} from "html-react-parser";
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
							<Link to={href}>{domToReact(domNode.children, options)}</Link>
						);
					}
				}

				if (domNode.name === "img") {
					const alt = domNode.attribs.alt ?? "";

					return (
						<img
							{...domNode.attribs}
							alt={alt}
							loading="lazy"
							className="rounded-4xl"
						/>
					);
				}
			}
		},
	};

	return (
		<div className={cn("pb-20", className)}>
			{parse(result.markup, options)}
		</div>
	);
}
