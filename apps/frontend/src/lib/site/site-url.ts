import { env } from "@/env";

function stripTrailingSlash(value: string) {
	return value.replace(/\/+$/, "");
}

export function getSiteUrl() {
	const value = env.VITE_APP_URL;
	return value ? stripTrailingSlash(value) : undefined;
}
