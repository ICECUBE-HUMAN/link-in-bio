import type { PageResponse } from "@sinabro/api";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader, Send, StackPerspective } from "reicon-react";
import { EditableParagraph } from "@/components/page/editable-paragraph";
import { PageImageEditor } from "@/components/page/page-image-editor";
import { PageSettingsMenu } from "@/components/page/page-settings-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	getMyPage,
	getPageByHandleQueryOptions,
	MY_PAGE_QUERY_KEY,
} from "@/lib/api/pages.functions";
import { getProfileImageUrl } from "@/lib/api/profile-image-api";
import { getSessionQueryOptions } from "@/lib/api/session.functions";
import { getPageMode } from "@/lib/page/page-mode";
import { usePageAutoSave } from "@/lib/page/use-page-auto-save";

type HandleLoaderData = {
	page: PageResponse;
	isCurrentUserPage: boolean;
};

export const Route = createFileRoute("/$handle")({
	loader: async ({ context, params }): Promise<HandleLoaderData> => {
		const [{ data: session }, result] = await Promise.all([
			context.queryClient.ensureQueryData(getSessionQueryOptions()),
			context.queryClient.ensureQueryData(
				getPageByHandleQueryOptions(params.handle),
			),
		]);

		if (session?.user && !session.user.primaryPageId) {
			throw redirect({
				to: "/new",
			});
		}

		if (!result) {
			throw notFound({
				routeId: Route.id,
			});
		}

		return {
			page: result.page,
			isCurrentUserPage: session?.user.id === result.page.userId,
		};
	},
	component: HandlePage,
});

function HandlePage() {
	const loaderData = Route.useLoaderData();

	return (
		<HandlePageContent key={loaderData.page.handle} loaderData={loaderData} />
	);
}

function HandlePageContent({ loaderData }: { loaderData: HandleLoaderData }) {
	const { page } = loaderData;
	const { data: sessionResult } = useQuery(getSessionQueryOptions());
	const isCurrentUserPage = sessionResult
		? sessionResult.data?.user.id === page.userId
		: loaderData.isCurrentUserPage;
	const isSignedIn = Boolean(sessionResult?.data?.user);
	const { data: myPageResult } = useQuery({
		queryKey: MY_PAGE_QUERY_KEY,
		queryFn: getMyPage,
		enabled: isSignedIn && !isCurrentUserPage,
	});
	const myPage = myPageResult?.page;
	const mode = getPageMode(isCurrentUserPage);
	const [isAsideShown, setIsAsideShown] = useState(false);
	const { draft, status, updateField } = usePageAutoSave({
		page,
		handle: page.handle,
		enabled: mode === "edit",
	});

	useEffect(() => {
		const frame = requestAnimationFrame(() => setIsAsideShown(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	return (
		<main className="box-border min-h-dvh w-full px-[clamp(1rem,2vw,3rem)] xl:h-dvh xl:overflow-hidden xl:flex xl:justify-center relative">
			<div className="flex w-full flex-col gap-8 sm:items-center xl:h-full xl:min-h-0 xl:flex-row xl:items-start xl:justify-around">
				<div className="flex w-full max-w-[24rem] flex-col xl:h-full xl:w-md xl:max-w-none">
					<aside
						className={`t-stagger flex w-full flex-1 flex-col gap-8 p-6 pt-12 xl:pt-16 ${isAsideShown ? "is-shown" : ""}`}
					>
						<div className="t-stagger-line t-stagger-line--1">
							<PageImageEditor
								initialImage={draft.image}
								handle={page.handle}
								mode={mode}
								onImageChange={(image) => updateField("image", image)}
							/>
						</div>
						<div className="flex flex-col gap-4 xl:px-2">
							<EditableParagraph
								value={draft.name}
								placeholder="Name"
								mode={mode}
								onChange={(name) => updateField("name", name)}
								rows={1}
								className="t-stagger-line t-stagger-line--2 text-3xl font-bold leading-tight tracking-tight xl:text-[40px]"
							/>
							<EditableParagraph
								value={draft.bio}
								placeholder="Tell about you"
								mode={mode}
								onChange={(bio) => updateField("bio", bio)}
								rows={2}
								className="t-stagger-line t-stagger-line--3 px-0.5 text-base leading-7 xl:leading-8 text-primary/80 xl:text-xl"
							/>
						</div>
					</aside>
					<aside
						className="hidden items-center gap-2 xl:flex xl:fixed xl:bottom-10 xl:px-6"
						aria-label="Page controls"
					>
						<div className="flex items-center gap-0">
							{isCurrentUserPage ? (
								<PageSettingsMenu page={page} />
							) : isSignedIn && myPage ? (
								<Button
									render={
										<Link to="/$handle" params={{ handle: myPage.handle }} />
									}
									variant="ghost"
									nativeButton={false}
									size="sm"
									className="text-muted-foreground/80 rounded-md gap-1.5"
								>
									<Avatar size="xs">
										<AvatarImage
											src={getProfileImageUrl(myPage.image) ?? undefined}
											alt=""
										/>
										<AvatarFallback />
									</Avatar>
									<span>My page</span>
								</Button>
							) : isSignedIn ? null : (
								<Button
									render={
										<Link
											to="/log-in"
											search={{ redirect: `/${page.handle}` }}
										/>
									}
									variant="ghost"
									nativeButton={false}
									size="sm"
									className="text-muted-foreground/80 rounded-md"
								>
									Log in
								</Button>
							)}
							<Button
								render={<Link to="/explore" />}
								variant={"ghost"}
								nativeButton={false}
								size="icon-sm"
								aria-label="Explore"
								className={"text-muted-foreground/80 rounded-md"}
							>
								<StackPerspective weight="Filled" />
							</Button>
							<Button
								variant={"ghost"}
								size={"icon-sm"}
								aria-label="Feedback"
								className={"text-muted-foreground/80 rounded-md"}
							>
								<Send weight="Filled" />
							</Button>
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							{status === "saving" ? (
								<span className="flex items-center gap-2">
									<Loader className="size-4 animate-spin" />
									Saving
								</span>
							) : null}
						</div>
					</aside>
				</div>
				<section className="min-h-[calc(100dvh-3rem)] w-full overflow-y-auto p-6 pt-0 sm:max-w-[24rem] xl:h-full xl:min-h-[calc(100dvh-4rem)] xl:w-4xl xl:max-w-none xl:shrink-0 xl:pt-16 no-scrollbar">
					grid later
				</section>
			</div>
		</main>
	);
}
