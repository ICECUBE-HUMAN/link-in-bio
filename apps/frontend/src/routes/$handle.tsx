import type { PageResponse } from "@sinabro/api";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader } from "reicon-react";
import { EditableParagraph } from "@/components/page/editable-paragraph";
import { PageImageEditor } from "@/components/page/page-image-editor";
import { usePageAutoSave } from "@/components/page/use-page-auto-save";
import { getPageByHandleQueryOptions } from "@/lib/api/pages.functions";
import { getSessionQueryOptions } from "@/lib/api/session.functions";

type HandleLoaderData = {
	page: PageResponse;
	isCurrentUserPage: boolean;
};

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

		return {
			sessionUserId: session?.user.id ?? null,
		};
	},
	loader: async ({ context, params }): Promise<HandleLoaderData> => {
		const result = await context.queryClient.ensureQueryData(
			getPageByHandleQueryOptions(params.handle),
		);

		if (!result) {
			throw notFound({
				routeId: Route.id,
			});
		}

		return {
			page: result.page,
			isCurrentUserPage: context.sessionUserId === result.page.userId,
		};
	},
	component: HandlePage,
});

function HandlePage() {
	const loaderData = Route.useLoaderData();
	const { page } = loaderData;
	const [isAsideShown, setIsAsideShown] = useState(false);
	const { draft, status, updateField } = usePageAutoSave({
		page,
		handle: page.handle,
	});

	useEffect(() => {
		const frame = requestAnimationFrame(() => setIsAsideShown(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	return (
		<main className="box-border min-h-dvh w-full px-[clamp(1rem,2vw,3rem)] xl:h-dvh xl:overflow-hidden xl:flex xl:justify-center">
			<div className="flex w-full flex-col gap-8 sm:items-center xl:h-full xl:min-h-0 xl:flex-row xl:items-start xl:justify-around">
				<aside
					className={`t-stagger flex w-full flex-col gap-8 p-6 pt-12 sm:max-w-[24rem] xl:w-md xl:max-w-none xl:pt-16 ${isAsideShown ? "is-shown" : ""}`}
				>
					<div className="t-stagger-line t-stagger-line--1">
						<PageImageEditor
							initialImage={draft.image}
							handle={page.handle}
							onImageChange={(image) => updateField("image", image)}
						/>
					</div>
					<div className="flex flex-col gap-4 xl:px-2">
						<EditableParagraph
							value={draft.name}
							placeholder="Name"
							onChange={(name) => updateField("name", name)}
							rows={1}
							className="t-stagger-line t-stagger-line--2 text-3xl xl:text-4xl font-bold leading-tight tracking-tight"
						/>
						<EditableParagraph
							value={draft.bio}
							placeholder="Tell about you"
							onChange={(bio) => updateField("bio", bio)}
							rows={2}
							className="t-stagger-line t-stagger-line--3 text-base xl:text-lg leading-6 text-primary/80 px-0.5"
						/>
					</div>
				</aside>
				<section className="min-h-[calc(100dvh-3rem)] w-full overflow-y-auto p-6 pt-0 sm:max-w-[24rem] xl:h-full xl:min-h-[calc(100dvh-4rem)] xl:w-4xl xl:max-w-none xl:shrink-0 xl:pt-16">
					grid later
				</section>
			</div>
			<aside
				className="fixed inset-x-0 bottom-0 z-50 flex w-full justify-start p-4"
				aria-live="polite"
				aria-label="Saving status"
			>
				{status === "saving" ? (
					<span className="flex items-center gap-2 text-xs text-muted-foreground">
						<Loader className="size-4 animate-spin" />
						Saving
					</span>
				) : null}
			</aside>
		</main>
	);
}
