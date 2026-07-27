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
import { Badge } from "@/components/ui/badge";
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
import { DEFAULT_APP_LOGO } from "@/lib/seo/metadata";

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
	head: ({ loaderData }) => {
		const title = loaderData?.page.name?.trim() || loaderData?.page.handle;
		const image = loaderData
			? (getProfileImageUrl(loaderData.page.image) ?? DEFAULT_APP_LOGO)
			: DEFAULT_APP_LOGO;

		return {
			meta: [
				{ title: title ?? "Sinabro" },
				{ property: "og:title", content: title ?? "Sinabro" },
				{ property: "og:image", content: image },
				{ name: "twitter:title", content: title ?? "Sinabro" },
				{ name: "twitter:image", content: image },
			],
			links: [
				{
					rel: "icon",
					href: image,
					"data-page-favicon": "true",
				},
			],
		};
	},
	component: HandlePage,
});

function HandlePage() {
	const loaderData = Route.useLoaderData();
	const [page, setPage] = useState(loaderData.page);

	useEffect(() => {
		setPage(loaderData.page);
	}, [loaderData.page]);

	return (
		<HandlePageContent
			loaderData={{ ...loaderData, page }}
			onPageChange={(nextPage) => {
				setPage(nextPage);
				window.history.replaceState(
					window.history.state,
					"",
					`/${encodeURIComponent(nextPage.handle)}${window.location.search}${window.location.hash}`,
				);
			}}
		/>
	);
}

function HandlePageContent({
	loaderData,
	onPageChange,
}: {
	loaderData: HandleLoaderData;
	onPageChange: (page: PageResponse) => void;
}) {
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
		document.title = draft.name?.trim() || page.handle;

		const faviconHref = getProfileImageUrl(draft.image) ?? DEFAULT_APP_LOGO;
		const iconLinks = Array.from(
			document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
		);
		const originalIconAttributes = iconLinks.map((link) => ({
			href: link.getAttribute("href"),
			type: link.getAttribute("type"),
		}));
		const favicon =
			document.head.querySelector<HTMLLinkElement>(
				'link[data-page-favicon="true"]',
			) ?? document.createElement("link");
		const isNewFavicon = !favicon.isConnected;

		favicon.rel = "icon";
		favicon.dataset.pageFavicon = "true";
		favicon.href = faviconHref;
		if (isNewFavicon) {
			document.head.appendChild(favicon);
		}

		for (const link of iconLinks) {
			link.href = faviconHref;
			link.removeAttribute("type");
		}

		return () => {
			iconLinks.forEach((link, index) => {
				const original = originalIconAttributes[index];
				if (original?.href === null) link.removeAttribute("href");
				else if (original?.href) link.href = original.href;
				if (original?.type === null) link.removeAttribute("type");
				else if (original?.type) link.type = original.type;
			});
			if (isNewFavicon) favicon.remove();
		};
	}, [draft.image, draft.name, page.handle]);

	useEffect(() => {
		const frame = requestAnimationFrame(() => setIsAsideShown(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	return (
		<main className="relative box-border min-h-dvh w-full px-[clamp(1rem,2vw,3rem)] min-[90rem]:flex min-[90rem]:h-dvh min-[90rem]:justify-center min-[90rem]:overflow-hidden">
			<div className="flex w-full flex-col gap-8 sm:items-center min-[90rem]:h-full min-[90rem]:min-h-0 min-[90rem]:flex-row min-[90rem]:items-start min-[90rem]:justify-around">
				<div className="flex min-w-0 w-full max-w-[24rem] flex-col min-[90rem]:h-full min-[90rem]:w-md min-[90rem]:max-w-none">
					<aside
						className={`t-stagger flex w-full flex-1 flex-col gap-8 p-6 pt-12 min-[90rem]:pt-16 ${isAsideShown ? "is-shown" : ""}`}
					>
						<div className="t-stagger-line t-stagger-line--1">
							<PageImageEditor
								initialImage={draft.image}
								handle={page.handle}
								mode={mode}
								onImageChange={(image) => updateField("image", image)}
							/>
						</div>
						<div className="flex min-w-0 flex-col gap-4 min-[90rem]:px-2">
							<EditableParagraph
								value={draft.name}
								placeholder="Name"
								mode={mode}
								onChange={(name) => updateField("name", name)}
								rows={1}
								className="t-stagger-line t-stagger-line--2 text-3xl font-bold leading-tight tracking-tight min-[90rem]:text-[40px]"
							/>
							<EditableParagraph
								value={draft.bio}
								placeholder="Tell about you"
								mode={mode}
								onChange={(bio) => updateField("bio", bio)}
								rows={2}
								className="t-stagger-line t-stagger-line--3 px-0.5 text-base leading-7 text-primary/80 min-[90rem]:text-xl min-[90rem]:leading-8"
							/>
						</div>
					</aside>
					<aside
						className="hidden items-center gap-2 min-[90rem]:fixed min-[90rem]:bottom-10 min-[90rem]:flex min-[90rem]:px-6"
						aria-label="Page controls"
					>
						<div className="flex items-center gap-0">
							{isCurrentUserPage ? (
								<PageSettingsMenu page={page} onChanged={onPageChange} />
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
						{status === "saving" && (
							<Badge
								variant="secondary"
								className="flex items-center gap-2 rounded-sm p-3.5 px-2 text-xs text-muted-foreground/80"
							>
								<span className="flex items-center gap-1.5">
									<Loader className="size-4 animate-spin" />
									Saving
								</span>
							</Badge>
						)}
					</aside>
				</div>
				<section className="min-h-[calc(100dvh-3rem)] w-full p-6 min overflow-y-auto pt-0 sm:max-w-[24rem] min-[90rem]:h-full min-[90rem]:min-h-[calc(100dvh-4rem)] min-[90rem]:w-4xl min-[90rem]:max-w-none min-[90rem]:shrink-0 min-[90rem]:pt-16 no-scrollbar">
					grid later
				</section>
			</div>
		</main>
	);
}
