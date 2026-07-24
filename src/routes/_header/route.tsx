import { createFileRoute, Outlet } from "@tanstack/react-router";
import Announcement from "@/components/layout/shell/announcement";
import { Footer } from "@/components/layout/shell/footer";
import Header from "@/components/layout/shell/header";

export const Route = createFileRoute("/_header")({
	component: HeaderLayout,
});

function HeaderLayout() {
	return (
		<div className="min-h-lvh pb-4 sm:pb-6 lg:pb-8">
			<div className="flex min-h-lvh flex-col bg-background">
				<Announcement />
				<Header />
				<div className="flex-1">
					<Outlet />
				</div>
			</div>
			<Footer variant="centered" />
		</div>
	);
}
