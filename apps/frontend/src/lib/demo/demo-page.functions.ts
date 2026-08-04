import {
	type PageByHandleResponse,
	pageByHandleResponseSchema,
} from "@sinabro/api";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { fetchBackend } from "@/lib/api/backend-client.server";

const DEMO_SOURCE_USER_ID = "OH1GRoqsiDaMteHkYe8E8FUP9RMVfMtU";
const DEMO_SOURCE_HANDLE = "tester";

export const getDemoPage = createServerFn({ method: "GET" }).handler(
	async (): Promise<PageByHandleResponse> => {
		const response = await fetchBackend(
			`/pages/${encodeURIComponent(DEMO_SOURCE_HANDLE)}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			throw new Error(
				`Demo source page request failed with status ${response.status}.`,
			);
		}

		const page = v.parse(pageByHandleResponseSchema, await response.json());
		if (page.page.userId !== DEMO_SOURCE_USER_ID) {
			throw new Error("Demo source page belongs to an unexpected user.");
		}

		return page;
	},
);
