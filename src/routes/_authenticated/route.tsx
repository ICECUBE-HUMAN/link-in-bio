import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import AppHeader from "@/components/layout/shell/app-header";
import { authClient } from "@/lib/auth/auth-client";

export const Route = createFileRoute("/_authenticated")({
	ssr: false,
	beforeLoad: async ({ location }) => {
		const { data: session } = await authClient.getSession();

		if (!session?.user) {
			throw redirect({
				to: "/log-in",
				search: {
					redirect: location.href,
				},
			});
		}

		return { session };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return (
		<div className="flex min-h-lvh flex-col pt-18">
			<AppHeader />
			<div className="flex-1">
				<Outlet />
			</div>
		</div>
	);
}
