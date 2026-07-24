import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { UserRoundIcon, WalletCardsIcon } from "lucide-react";

const accountRoutes = [
	{ to: "/account", label: "Account", icon: UserRoundIcon, exact: true },
	{
		to: "/account/billing",
		label: "Billing",
		icon: WalletCardsIcon,
		exact: false,
	},
] as const;

export const Route = createFileRoute("/_authenticated/account")({
	component: AccountLayout,
});

function AccountLayout() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-24 lg:flex-row">
			<aside className="border-b px-5 lg:flex-2 lg:border-0">
					<div className="flex flex-row gap-6 lg:gap-2 lg:flex-col">
						{accountRoutes.map((route) => (
							<Link
								key={route.to}
								to={route.to}
								activeOptions={route.exact ? { exact: true } : undefined}
								className="flex items-center gap-2 font-medium text-base lg:w-full lg:text-sm pb-2"
								activeProps={{ className: "text-foreground border-b-2 border-primary lg:border-0" }}
								inactiveProps={{ className: "text-muted-foreground" }}
							>
								<route.icon className="size-5 shrink-0 lg:size-4" />
								{route.label}
							</Link>
						))}
					</div>
			</aside>

			<section className="min-w-0 flex-4 px-5 py-8 lg:py-0">
				<Outlet />
			</section>
		</main>
	);
}
