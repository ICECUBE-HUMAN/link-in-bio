import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import type { authClient } from "@/lib/auth/auth-client";
import { fetchBackend } from "./backend-client.server";

export type AuthSession = typeof authClient.$Infer.Session;

export type GetSessionResult = {
	data: AuthSession | null;
	error: { message?: string } | null;
};

export const getSession = createServerFn({ method: "GET" }).handler(
	async (): Promise<GetSessionResult> => {
		const cookie = getRequestHeader("cookie");
		const headers = new Headers();

		setResponseHeader("cache-control", "no-store");
		setResponseHeader("vary", "Cookie");

		if (cookie) {
			headers.set("cookie", cookie);
		}

		const response = await fetchBackend("/auth/get-session", {
			method: "GET",
			headers,
		});

		if (response.status === 401) {
			return { data: null, error: null };
		}

		if (!response.ok) {
			throw new Error(`Session request failed with status ${response.status}.`);
		}

		const session = (await response.json()) as AuthSession | null;

		return { data: session, error: null };
	},
);

export const SESSION_QUERY_KEY = ["auth", "session"] as const;
// 변경: 세션 변경을 즉시 반영하기 위해 브라우저 세션 조회를 오래 보관하지 않는다.
export const SESSION_STALE_TIME_MS = 0;

export function getSessionQueryOptions() {
	return queryOptions({
		queryKey: SESSION_QUERY_KEY,
		queryFn: getSession,
		staleTime: SESSION_STALE_TIME_MS,
	});
}

export function invalidateSessionQuery(queryClient: QueryClient) {
	return queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY });
}

export function clearSessionQuery(queryClient: QueryClient) {
	queryClient.setQueryData<GetSessionResult>(SESSION_QUERY_KEY, {
		data: null,
		error: null,
	});

	return queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
}
