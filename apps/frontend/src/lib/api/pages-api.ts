import {
	normalizePageHandle,
	type UpdatePageRequest,
	type UpdatePageResponse,
} from "@sinabro/api";
import { parsePageUpdateResponse } from "@/lib/page/page-update";

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

export type PageApiError = Error & { code?: string };

async function throwPageApiError(response: Response): Promise<never> {
	const body = (await response.json().catch(() => null)) as {
		error?: { code?: string; message?: string };
	} | null;
	const error = new Error(
		body?.error?.message ??
			`Page request failed with status ${response.status}.`,
	) as PageApiError;
	error.code = body?.error?.code;
	throw error;
}

export async function changePrimaryPage(handle: string): Promise<void> {
	const response = await fetch(
		`/api/pages/${encodeURIComponent(normalizePageHandle(handle))}/primary`,
		{ method: "PATCH", credentials: "include" },
	);
	if (!response.ok) await throwPageApiError(response);
}

export async function deletePage(handle: string): Promise<void> {
	const response = await fetch(
		`/api/pages/${encodeURIComponent(normalizePageHandle(handle))}`,
		{ method: "DELETE", credentials: "include" },
	);
	if (!response.ok) await throwPageApiError(response);
}
