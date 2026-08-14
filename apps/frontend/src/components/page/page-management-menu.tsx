import type { OwnedPageSummary, PageResponse } from "@sinabro/api";
import { PRO_PAGE_LIMIT } from "@sinabro/plan";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheckIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { CreatePageFlow } from "@/components/page/create-page-flow";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getOwnedPages,
	MY_PAGE_QUERY_KEY,
	OWNED_PAGES_QUERY_KEY,
} from "@/lib/api/pages.functions";
import { getProfileImageUrl } from "@/lib/api/profile-image-api";

type PageManagementMenuProps = {
	triggerPage?: PageResponse | null;
};

export function PageManagementMenu({ triggerPage }: PageManagementMenuProps) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const { data, isPending, isError } = useQuery({
		queryKey: OWNED_PAGES_QUERY_KEY,
		queryFn: getOwnedPages,
	});
	const pages = data?.pages ?? [];
	const sortedPages = [...pages].sort(
		(a, b) => Number(b.isPrimary) - Number(a.isPrimary),
	);
	const primaryPage = sortedPages.find((page) => page.isPrimary);
	const displayPage = triggerPage ?? primaryPage;
	const isLoading = !displayPage && isPending;

	async function refreshOwnedPages() {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: OWNED_PAGES_QUERY_KEY }),
			queryClient.invalidateQueries({ queryKey: MY_PAGE_QUERY_KEY }),
		]);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={<Button variant="ghost" size="sm" />}
				disabled={isLoading || !displayPage}
				aria-busy={isLoading}
				aria-label={isLoading ? "Loading page" : undefined}
				className="text-muted-foreground/80 rounded-md gap-1.5"
			>
				{isLoading ? (
					<Skeleton className="h-4 w-20 rounded-md" />
				) : displayPage ? (
					<>
						<Avatar size="xs">
							<AvatarImage
								src={getProfileImageUrl(displayPage.image) ?? undefined}
								alt=""
							/>
							<AvatarFallback />
						</Avatar>
						<span className="max-w-32 truncate">
							{displayPage.name?.trim() || `${displayPage.handle}`}
						</span>
					</>
				) : null}
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={12}
				className="w-68 t-resize overflow-hidden p-2 rounded-2xl beautiful-shadow bg-background"
			>
				{isError ? (
					<p className="px-3 py-4 text-xs text-destructive" role="alert">
						Could not load your pages.
					</p>
				) : isPending && !data ? (
					<PageManagementSkeleton />
				) : (
					<PageManagementView
						pages={sortedPages}
						canManagePages={data?.hasAccess === true}
						onRefresh={refreshOwnedPages}
						onPageSelect={() => setOpen(false)}
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}

export function PageManagementView({
	pages,
	canManagePages = true,
	onRefresh,
	onPageSelect,
}: {
	pages: OwnedPageSummary[];
	canManagePages?: boolean;
	onRefresh: () => Promise<void>;
	onPageSelect: () => void;
}) {
	const navigate = useNavigate();
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	async function handleCreated(handle: string) {
		setIsCreateOpen(false);
		await onRefresh();
		await navigate({ to: "/$handle", params: { handle } });
	}

	return (
		<div className="flex h-full flex-col gap-1">
			<div className="flex min-h-0 flex-1 flex-col gap-1">
				{pages.map((ownedPage) => (
					<div
						key={ownedPage.id}
						className={`group flex items-center rounded-lg hover:bg-muted`}
					>
						<Button
							render={
								<Link to="/$handle" params={{ handle: ownedPage.handle }} />
							}
							size="lg"
							variant="ghost"
							nativeButton={false}
							onClick={onPageSelect}
							className={`min-w-0 flex-1 rounded-lg h-15 hover:bg-transparent ${ownedPage.isPrimary ? "justify-between" : "justify-start"}`}
						>
							<div className="flex min-w-0 items-center gap-2">
								<Avatar size="default" className="size-9">
									<AvatarImage
										src={getProfileImageUrl(ownedPage.image) ?? undefined}
										alt=""
									/>
									<AvatarFallback />
									{ownedPage.isPrimary ? (
										<AvatarBadge className="size-5! -right-1 -bottom-1 [&>svg]:size-full! bg-transparent ring-0">
											<BadgeCheckIcon
												className="stroke-white fill-brand size-full!"
												aria-hidden="true"
											/>
										</AvatarBadge>
									) : null}
								</Avatar>
								<div className="flex min-w-0 flex-col">
									<span>{ownedPage.name}</span>
									<span className="truncate text-muted-foreground/80">
										/{ownedPage.handle}
									</span>
								</div>
							</div>
						</Button>
					</div>
				))}
			</div>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<Button
					type="button"
					size="lg"
					variant="ghost"
					className="justify-between items-center rounded-lg h-15"
					disabled={!canManagePages || pages.length >= PRO_PAGE_LIMIT}
					onClick={() => setIsCreateOpen(true)}
				>
					<span>Create page</span>
					<PlusIcon />
				</Button>
				<DialogContent className="gap-0 overflow-hidden p-6 sm:max-w-md">
					<DialogTitle className="sr-only">Create a new page</DialogTitle>
					<DialogDescription className="sr-only">
						Choose a handle and role for your new page.
					</DialogDescription>
					<CreatePageFlow onCreated={(handle) => void handleCreated(handle)} />
				</DialogContent>
			</Dialog>
		</div>
	);
}

function PageManagementSkeleton() {
	return (
		<div className="flex flex-col gap-1" aria-hidden="true">
			{["primary", "secondary", "create"].map((key) => (
				<div key={key} className="flex h-15 items-center gap-2 rounded-lg px-4">
					<Skeleton className="size-9 rounded-full" />
					<div className="flex flex-1 flex-col gap-1">
						<Skeleton className="h-4 w-24 rounded-md" />
						<Skeleton className="h-3 w-16 rounded-md" />
					</div>
				</div>
			))}
		</div>
	);
}
