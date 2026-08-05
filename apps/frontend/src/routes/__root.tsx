import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import {
	createSeo,
	DEFAULT_SEO_DESCRIPTION,
	defaultHeadLinks,
} from "@/lib/seo/metadata";
import appCss from "../styles.css?url";
import { TooltipProvider } from "@/components/ui/tooltip";

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
        <TooltipProvider>
          <main className="flex min-h-svh flex-col">
            {children}
          </main>
        </TooltipProvider>
				<Toaster position="bottom-center" />
				<Scripts />
			</body>
		</html>
	);
}
