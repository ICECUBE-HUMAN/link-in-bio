import type { OwnedPageSummary } from "@sinabro/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CreatePageFlow } from "@/components/page/create-page-flow";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	getOwnedPages,
	MY_PAGE_QUERY_KEY,
	OWNED_PAGES_QUERY_KEY,
	changePrimaryPage,
	deletePage,
} from "@/lib/api/pages.functions";
import { Button } from "../ui/button";

export function PagePicker({ currentHandle }: { currentHandle: string }) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const { data } = useQuery({
		queryKey: OWNED_PAGES_QUERY_KEY,
		queryFn: getOwnedPages,
	});
	const pages = data?.pages ?? [];
	const primaryPage = pages.find((page) => page.isPrimary);
	const pendingPage = pages.find((page) => page.deletionScheduledAt);

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: OWNED_PAGES_QUERY_KEY,
			}),
			queryClient.invalidateQueries({
				queryKey: MY_PAGE_QUERY_KEY,
			}),
		]);
	}

	async function makePrimary(page: OwnedPageSummary) {
		setError(null);
		try {
			await changePrimaryPage({ data: { handle: page.handle } });
			await refresh();
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Could not change page.",
			);
		}
	}

	async function remove(page: OwnedPageSummary) {
		if (!window.confirm(`Delete /${page.handle}?`)) return;
		setError(null);
		try {
			await deletePage({ data: { handle: page.handle } });
			await refresh();
			if (page.handle === currentHandle && primaryPage) {
				await navigate({
					to: "/$handle",
					params: { handle: primaryPage.handle },
				});
			}
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Could not delete page.",
			);
		}
	}

	async function handleCreated(handle: string) {
		setIsCreateOpen(false);
		await refresh();
		await navigate({ to: "/$handle", params: { handle } });
	}

	if (pages.length === 0) return null;
	return (
		<div className="flex min-w-56 flex-col gap-1 rounded-lg bg-background p-2 shadow-lg">
			{pages.map((page) => (
				<div key={page.id} className="flex items-center gap-1">
					<Button
						render={
							<Link
								to="/$handle"
								params={{
									handle: page.handle,
								}}
							/>
						}
						variant={page.handle === currentHandle ? "secondary" : "ghost"}
						nativeButton={false}
						className="min-w-0 flex-1 justify-start"
					>
						<span className="truncate">/{page.handle}</span>
						{page.isPrimary ? <span title="Primary">★</span> : null}
						{data?.hasAccess === false && !page.isPrimary ? (
							<span className="text-xs text-muted-foreground">Read-only</span>
						) : null}
					</Button>
					{!page.isPrimary ? (
						<>
							<Button
								size="sm"
								variant="ghost"
								disabled={data?.hasAccess === false}
								onClick={() => void makePrimary(page)}
							>
								Primary
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => void remove(page)}
							>
								Delete
							</Button>
						</>
					) : null}
				</div>
			))}
			{pendingPage?.deletionScheduledAt ? (
				<p className="px-2 text-xs text-muted-foreground">
					Deletion scheduled:{" "}
					{new Date(pendingPage.deletionScheduledAt).toLocaleDateString()}
				</p>
			) : null}
			{data?.hasAccess && pages.length < 3 ? (
				<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
					<Button
						type="button"
						variant="ghost"
						className="justify-start"
						onClick={() => setIsCreateOpen(true)}
					>
						New page
					</Button>
					<DialogContent className="gap-0 overflow-hidden p-6 sm:max-w-md">
						<DialogTitle className="sr-only">Create a new page</DialogTitle>
						<DialogDescription className="sr-only">
							Choose a handle and role for your new page.
						</DialogDescription>
						<CreatePageFlow
							onCreated={(handle) => void handleCreated(handle)}
						/>
					</DialogContent>
				</Dialog>
			) : null}
			{error ? <p className="px-2 text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
