import {
	type PageResponse,
	pageResponseSchema,
	type UpdatePageRequest,
	updatePageResponseSchema,
} from "@sinabro/api";
import * as v from "valibot";

export type EditablePageFields = Pick<
	PageResponse,
	"name" | "bio" | "image"
>;

export function getChangedPageFields(
	draft: EditablePageFields,
	previous: EditablePageFields,
): UpdatePageRequest {
	const changes: UpdatePageRequest = {};

	for (const field of ["name", "bio", "image"] as const) {
		if (draft[field] !== previous[field]) {
			changes[field] = draft[field];
		}
	}

	return changes;
}

export function mergePageUpdate(
	_current: EditablePageFields,
	pending: UpdatePageRequest,
): UpdatePageRequest {
	return { ...pending };
}

export function parsePageUpdateResponse(input: unknown) {
	if (typeof input === "object" && input !== null) {
		if ("page" in input) {
			return v.parse(updatePageResponseSchema, input);
		}

		if ("data" in input) {
			return parsePageUpdateResponse(input.data);
		}
	}

	return v.parse(updatePageResponseSchema, {
		page: v.parse(pageResponseSchema, input),
	});
}
