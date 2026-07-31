import type { PageItemResponse } from "@sinabro/api";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { enrichPageItemMetadata } from "@/lib/api/link-metadata-api";
import type { GridItem } from "@/lib/grid/types";

type UseLinkMetadataEnrichmentOptions = {
	handle: string;
	flushPendingChanges: () => Promise<readonly GridItem[]>;
	replaceItemFromServer: (item: PageItemResponse) => void;
};

export function useLinkMetadataEnrichment({
	handle,
	flushPendingChanges,
	replaceItemFromServer,
}: UseLinkMetadataEnrichmentOptions) {
	const [enrichingItemIds, setEnrichingItemIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const controllersRef = useRef(new Map<string, AbortController>());

	useEffect(() => {
		return () => {
			for (const controller of controllersRef.current.values()) {
				controller.abort();
			}
			controllersRef.current.clear();
		};
	}, []);

	async function enrichLinkItem(itemId: string, url: string) {
		const controller = new AbortController();
		controllersRef.current.get(itemId)?.abort();
		controllersRef.current.set(itemId, controller);
		setEnrichingItemIds((current) => new Set(current).add(itemId));

		try {
			const savedItems = await flushPendingChanges();
			const savedItem = savedItems.find((item) => item.id === itemId);
			if (
				controller.signal.aborted ||
				!savedItem ||
				savedItem.type !== "link" ||
				savedItem.data.url !== url
			)
				return;

			const response = await enrichPageItemMetadata(
				handle,
				{ itemId, url },
				controller.signal,
			);
			if (!controller.signal.aborted) replaceItemFromServer(response.item);
		} catch (error) {
			if (!(error instanceof Error && error.name === "AbortError")) {
				toast.error(
					error instanceof Error ? error.message : "Link metadata failed.",
				);
			}
		} finally {
			if (controllersRef.current.get(itemId) === controller) {
				controllersRef.current.delete(itemId);
				setEnrichingItemIds((current) => {
					const next = new Set(current);
					next.delete(itemId);
					return next;
				});
			}
		}
	}

	return { enrichingItemIds, enrichLinkItem };
}
