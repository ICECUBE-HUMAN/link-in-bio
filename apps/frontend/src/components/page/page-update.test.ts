import { describe, expect, it } from "vitest";
import {
	getChangedPageFields,
	mergePageUpdate,
	parsePageUpdateResponse,
} from "./page-update";

describe("page update helpers", () => {
	it("returns all changed fields as one update payload", () => {
		expect(
			getChangedPageFields(
				{ name: "New name", bio: "New bio", image: "new-image.jpg" },
				{ name: "Old name", bio: "Old bio", image: "old-image.jpg" },
			),
		).toEqual({
			name: "New name",
			bio: "New bio",
			image: "new-image.jpg",
		});
	});

	it("keeps the latest value when multiple changes are queued", () => {
		expect(
			mergePageUpdate(
				{ name: "First", bio: "Bio", image: null },
				{ name: "Second" },
			),
		).toEqual({ name: "Second" });
	});

	it("normalizes a direct page response into the shared response shape", () => {
		expect(
			parsePageUpdateResponse({
				id: "page_1",
				userId: "user_1",
				handle: "kim",
				name: "Kim",
				bio: null,
				image: null,
				role: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			}),
		).toMatchObject({ page: { id: "page_1" } });
	});

	it("normalizes a data-wrapped page response", () => {
		expect(
			parsePageUpdateResponse({
				data: {
					page: {
						id: "page_1",
						userId: "user_1",
						handle: "kim",
						name: "Kim",
						bio: null,
						image: null,
						role: null,
						createdAt: "2026-01-01T00:00:00.000Z",
						updatedAt: "2026-01-01T00:00:00.000Z",
					},
				},
			}),
		).toMatchObject({ page: { id: "page_1" } });
	});
});
