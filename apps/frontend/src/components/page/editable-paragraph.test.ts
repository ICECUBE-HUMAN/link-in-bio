import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { EditableParagraph } from "./editable-paragraph";

describe("EditableParagraph", () => {
	test("preserves line breaks in view mode", () => {
		const markup = renderToStaticMarkup(
			createElement(EditableParagraph, {
				value: "first line\nsecond line",
				placeholder: "Tell about you",
				mode: "view",
				onChange: () => {},
			}),
		);

		expect(markup).toContain("whitespace-pre-wrap");
		expect(markup).toContain("first line\nsecond line");
	});

	test("does not render the placeholder in view mode when empty", () => {
		const markup = renderToStaticMarkup(
			createElement(EditableParagraph, {
				value: null,
				placeholder: "Tell about you",
				mode: "view",
				onChange: () => {},
			}),
		);

		expect(markup).not.toContain("Tell about you");
	});
});
