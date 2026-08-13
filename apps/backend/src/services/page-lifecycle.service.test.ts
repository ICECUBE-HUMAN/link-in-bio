import {
	describe,
	expect,
	it,
} from "bun:test";
import { getPageDeletionDeadline } from "./page-lifecycle.service";

describe("page lifecycle", () => {
	it("schedules deletion seven days after period end", () => {
		const periodEnd = new Date(
			"2026-08-13T00:00:00.000Z",
		);
		expect(
			getPageDeletionDeadline(
				periodEnd,
			),
		).toEqual(
			new Date(
				"2026-08-20T00:00:00.000Z",
			),
		);
	});
});
