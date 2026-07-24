import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	return <main className="flex items-center justify-center px-5 py-24" />;
}
