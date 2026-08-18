import { createFileRoute, Outlet } from "@tanstack/react-router";

const ENTRY_IMAGE_SRC = "https://cdn.grabbin.me/assets/features/5.jpg";

export const Route = createFileRoute("/(entry)/_layout")({
	component: EntryRouteLayout,
});

function EntryRouteLayout() {
	return (
		<main className="relative mx-auto flex h-lvh w-full grow items-center justify-between px-5 py-6">
			<aside className="flex basis-0 flex-1 justify-center">
        <section className="relative flex w-full max-w-sm flex-col gap-10">
					<Outlet />
				</section>
			</aside>
			<aside className="hidden h-full basis-0 flex-1 xl:block">
				<img
					src={ENTRY_IMAGE_SRC}
					alt=""
					className="h-full w-full rounded-[2rem] object-cover"
				/>
			</aside>
		</main>
	);
}
