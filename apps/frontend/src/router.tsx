import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import ErrorState from "@/components/layout/states/error";
import NotFound from "@/components/layout/states/not-found";
import Pending from "@/components/layout/states/pending";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: false,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: NotFound,
		defaultErrorComponent: ErrorState,
		// defaultPendingComponent: Pending,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient: context.queryClient as never,
		hydrateOptions: {
			defaultOptions: {},
		},
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
