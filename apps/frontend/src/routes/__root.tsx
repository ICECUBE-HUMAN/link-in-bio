import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
	useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPageView } from "@/lib/analytics/simple-analytics";
import {
	createSeo,
	DEFAULT_SEO_DESCRIPTION,
	defaultHeadLinks,
} from "@/lib/seo/metadata";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

const rootSeo = createSeo({
	description: DEFAULT_SEO_DESCRIPTION,
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		...rootSeo,
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				name: "theme-color",
				content: "#ffffff",
			},
			...rootSeo.meta,
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			...defaultHeadLinks,
			...rootSeo.links,
		],
		scripts: [
			{
				src: "https://scripts.simpleanalyticscdn.com/latest.js",
				async: true,
				"data-auto-collect": "false",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full">
			<head>
				<HeadContent />
			</head>
			<body className="flex flex-col">
				<SimpleAnalyticsTracker />
				<TooltipProvider>
					<main className="flex min-h-svh flex-col">{children}</main>
				</TooltipProvider>
				<Toaster position="bottom-center" />
				<Scripts />
			</body>
		</html>
	);
}

function SimpleAnalyticsTracker() {
	const { pathname } = useLocation();

	useEffect(() => trackPageView(pathname), [pathname]);

	return null;
}
