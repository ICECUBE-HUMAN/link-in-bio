import type { OwnedPageSummary } from "@sinabro/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	getOwnedPages,
	MY_PAGE_QUERY_KEY,
	OWNED_PAGES_QUERY_KEY,
} from "@/lib/api/pages.functions";
import { changePrimaryPage, deletePage } from "@/lib/api/pages-api";
import { Button } from "../ui/button";

export function PagePicker({ currentHandle }: { currentHandle: string }) {
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const { data } = useQuery({
		queryKey: OWNED_PAGES_QUERY_KEY,
		queryFn: getOwnedPages,
	});
	const pages = data?.pages ?? [];
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
			await changePrimaryPage(page.handle);
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
			await deletePage(page.handle);
			await refresh();
		} catch (caught) {
			setError(
				caught instanceof Error ? caught.message : "Could not delete page.",
			);
		}
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
						{page.lifecycleStatus === "read_only" ? (
							<span className="text-xs text-muted-foreground">Read-only</span>
						) : null}
					</Button>
					{!page.isPrimary ? (
						<>
							<Button
								size="sm"
								variant="ghost"
								disabled={page.lifecycleStatus === "read_only"}
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
			{error ? <p className="px-2 text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
