declare module "cloudflare:workers" {
	export const env: {
		ASSETS: {
			fetch: typeof fetch;
		};
		BACKEND?: {
			fetch: typeof fetch;
		};
		BETTER_AUTH_URL?: string;
		SIMPLE_ANALYTICS_API_KEY?: string;
	};
}
