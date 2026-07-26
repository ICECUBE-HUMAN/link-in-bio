import { createFileRoute, redirect } from "@tanstack/react-router";
import LogInSection from "@/components/auth/log-in-section";
import { getSessionQueryOptions } from "@/lib/api/session.functions";
import { sanitizeAuthRedirect } from "@/lib/auth/auth-redirect";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

const LOG_IN_DESCRIPTION = "Log in to your account";

export const Route = createFileRoute("/log-in/")({
	validateSearch: (search) => ({
		redirect: sanitizeAuthRedirect(search.redirect), // TODO: 실제 handle로 인동
	}),
	beforeLoad: async ({ context, search }) => {
		const { data: session } = await context.queryClient.ensureQueryData(
			getSessionQueryOptions(),
		);

		if (session?.user) {
			throw redirect({
				to: search.redirect,
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

	return <LogInSection layoutMode="split" redirectTo={search.redirect} />;
}
