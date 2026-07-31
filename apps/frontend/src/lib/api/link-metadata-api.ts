import {
	type PageItemMetadataRequest,
	pageItemMetadataResponseSchema,
} from "@sinabro/api";
import * as v from "valibot";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

export async function enrichPageItemMetadata(
	handle: string,
	request: PageItemMetadataRequest,
	signal: AbortSignal,
) {
	const response = await fetch(
		`${getApiBaseUrl()}/pages/${encodeURIComponent(handle)}/metadata`,
		{
			method: "POST",
			credentials: "include",
			signal,
			headers: { "content-type": "application/json" },
			body: JSON.stringify(request),
		},
	);

	if (!response.ok) {
		throw new Error(`Link metadata failed with status ${response.status}.`);
	}

	return v.parse(pageItemMetadataResponseSchema, await response.json());
}
