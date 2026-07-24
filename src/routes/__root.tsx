import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import {
	createSeo,
	DEFAULT_SEO_DESCRIPTION,
	defaultHeadLinks,
} from "@/lib/seo/metadata";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
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
			<body className="flex min-h-lvh flex-col">
				<main className="flex min-h-lvh flex-1 flex-col">{children}</main>
				<Toaster position="bottom-center" />
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
