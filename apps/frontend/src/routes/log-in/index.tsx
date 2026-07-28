import { createFileRoute, redirect } from "@tanstack/react-router";
import LogInSection from "@/components/auth/log-in-section";
import { getMyPage, MY_PAGE_QUERY_KEY } from "@/lib/api/pages.functions";
import { getSessionQueryOptions } from "@/lib/api/session.functions";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

const LOG_IN_DESCRIPTION = "Log in to your account";

export const Route = createFileRoute("/log-in/")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
		(typeof search.redirect === "string" ? { redirect: search.redirect } : {}),
	beforeLoad: async ({ context }) => {
		const { data: session } = await context.queryClient.ensureQueryData(
			getSessionQueryOptions(),
		);

		if (session?.user) {
			const myPage = session.user.primaryPageId
				? await context.queryClient.ensureQueryData({
						queryKey: MY_PAGE_QUERY_KEY,
						queryFn: getMyPage,
					})
				: null;

			if (myPage?.page?.handle) {
				throw redirect({
					to: "/$handle",
					params: { handle: myPage.page.handle },
				});
			}

			throw redirect({
				to: "/new",
			});
		}
	},
	staticData: {
		header: {
			label: "Log in",
			order: 40,
		},
		footer: {
			label: "Log in",
			order: 40,
		},
	},
	head: () =>
		createSeo({
			title: "Log in",
			description: LOG_IN_DESCRIPTION,
			canonicalPath: "/log-in",
			jsonLd: createWebPageJsonLd({
				title: "Log in",
				description: LOG_IN_DESCRIPTION,
				path: "/log-in",
			}),
		}),
	component: LogInPage,
});

function LogInPage() {
	const search = Route.useSearch();

	return <LogInSection redirectTo={search.redirect ?? "/"} />;
}
