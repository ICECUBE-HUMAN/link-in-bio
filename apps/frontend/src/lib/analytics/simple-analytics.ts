declare global {
	interface Window {
		sa_pageview?: (path?: string) => void;
	}
}

const pageAnalyticsPath = (pageId: string) =>
	`/__analytics/pages/${encodeURIComponent(pageId)}`;

export function trackPageView(path: string): () => void {
	if (typeof window === "undefined") return () => {};

	if (window.sa_pageview) {
		window.sa_pageview(path);
		return () => {};
	}

	const retryOnLoad = () => window.sa_pageview?.(path);
	window.addEventListener("load", retryOnLoad, { once: true });

	return () => window.removeEventListener("load", retryOnLoad);
}

export function trackPageIdPageView(pageId: string): () => void {
	return trackPageView(pageAnalyticsPath(pageId));
}
