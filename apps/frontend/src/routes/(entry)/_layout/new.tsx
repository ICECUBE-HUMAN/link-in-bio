import { createFileRoute, redirect } from "@tanstack/react-router";
import { NewPage } from "@/components/page/new-page";
import { getSessionQueryOptions } from "@/lib/api/session.functions";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

const NEW_PAGE_DESCRIPTION = "Create your page.";

export const Route = createFileRoute("/(entry)/_layout/new")({
	beforeLoad: async ({ context }) => {
		const { data: session } = await context.queryClient.ensureQueryData(
			getSessionQueryOptions(),
		);
		if (!session?.user) {
			throw redirect({ to: "/log-in", search: { redirect: "/new" } });
		}
		if (session.user.primaryPageId) throw redirect({ to: "/" });
		return {};
	},
	head: () =>
		createSeo({
			title: "Create your page",
			description: NEW_PAGE_DESCRIPTION,
			canonicalPath: "/new",
			noIndex: true,
			jsonLd: createWebPageJsonLd({
				title: "New page",
				description: NEW_PAGE_DESCRIPTION,
				path: "/new",
			}),
		}),
	component: NewPage,
});
