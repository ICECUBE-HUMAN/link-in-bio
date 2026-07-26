import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSessionQueryOptions } from "@/lib/api/session.functions";

export const Route = createFileRoute("/$handle")({
	beforeLoad: async ({ context }) => {
		const { data: session } = await context.queryClient.ensureQueryData(
			getSessionQueryOptions(),
		);

		if (session?.user && !session.user.primaryPageId) {
			throw redirect({
				to: "/new",
			});
		}
	},
	component: HandlePage,
});

function HandlePage() {
	const { handle } = Route.useParams();

	return (
		<main className="mx-auto flex min-h-lvh w-full max-w-4xl flex-col justify-center gap-5 px-5 py-20">
			<p className="font-medium text-muted-foreground text-sm">/{handle}</p>
			<h1 className="text-3xl font-bold text-balance md:text-5xl">{handle}</h1>
		</main>
	);
}
