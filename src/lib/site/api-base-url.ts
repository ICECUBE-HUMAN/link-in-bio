import { env } from "@/env";

const LOCAL_API_BASE_URL = "http://localhost:8787";

function stripTrailingSlash(value: string) {
	return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
	const value = import.meta.env.DEV
		? (env.VITE_API_BASE_URL ?? LOCAL_API_BASE_URL)
		: env.VITE_API_BASE_URL;

	if (!value) {
		throw new Error("VITE_API_BASE_URL is required outside local development.");
	}

	return stripTrailingSlash(value);
}
