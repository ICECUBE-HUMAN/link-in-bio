import {
	normalizePageHandle,
	type UpdatePageRequest,
	type UpdatePageResponse,
} from "@sinabro/api";
import { parsePageUpdateResponse } from "@/components/page/page-update";

export async function updatePage(
	handle: string,
	data: UpdatePageRequest,
): Promise<UpdatePageResponse> {
	const response = await fetch(
		`/api/pages/${encodeURIComponent(normalizePageHandle(handle))}`,
		{
			method: "PATCH",
			credentials: "include",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(data),
		},
	);

	if (!response.ok) {
		throw new Error(`Page update failed with status ${response.status}.`);
	}

	return parsePageUpdateResponse(await response.json());
}
