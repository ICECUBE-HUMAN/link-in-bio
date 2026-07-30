import type {
	PageByHandleResponse,
	PageItemBatchRequest,
	PageItemBatchResponse,
	PageItemResponse,
} from "@sinabro/api";
import { hasPageItemContent, pageItemBatchResponseSchema } from "@sinabro/api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import * as v from "valibot";
import { getPageByHandleQueryOptions } from "@/lib/api/pages.functions";
import { PAGE_AUTOSAVE_DEBOUNCE_MS } from "@/lib/page/use-page-auto-save";
import { getApiBaseUrl } from "@/lib/site/api-base-url";
import { createGridItem } from "./item-factory";
import {
	applyPresetToLayoutMap,
	getAllowedPresets,
	getColumns,
	inferPresetFromLayouts,
	mergeLayoutMapIntoItems,
	resolveAxisAwareSwap,
	toLayoutMap,
	validateLayout,
} from "./layout-engine";
import type { Breakpoint, GridEditorCommand, GridItem } from "./types";

export type GridEditorStatus = "saved" | "dirty" | "saving" | "error";

type SavePendingChangesResult = { ok: true } | { ok: false; error: Error };

type UseGridEditorStoreOptions = {
	initialItems: readonly PageItemResponse[];
	handle: string;
	breakpoint: Breakpoint;
	enabled?: boolean;
	persistItems?: boolean;
};

function toGridItem(item: PageItemResponse): GridItem {
	return {
		...item,
		preset: inferPresetFromLayouts(item.type, item.layouts),
	};
}

function toPageItem(item: GridItem): PageItemResponse {
	const { preset: _preset, ...pageItem } = item;
	return pageItem;
}

function toBatchItem(item: GridItem): PageItemBatchRequest["upserts"][number] {
	const { id, type, data, style, layouts } = item;
	switch (type) {
		case "text":
			return { id, type, data, style, layouts };
		case "media":
			return {
				id,
				type,
				data: {
					objectKey: data.objectKey,
					mimeType: data.mimeType,
					caption: data.caption,
				},
				style,
				layouts,
			};
		case "map":
			return { id, type, data, style, layouts };
		case "section":
			return { id, type, data, style, layouts };
		case "link":
			return { id, type, data, style, layouts };
	}
}

function sameItem(
	left: PageItemBatchRequest["upserts"][number],
	right: PageItemBatchRequest["upserts"][number] | undefined,
) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function createBatch(
	items: readonly GridItem[],
	persisted: readonly GridItem[],
	deletedIds: ReadonlySet<string>,
): PageItemBatchRequest {
	const persistedById = new Map(
		persisted.map((item) => [item.id, toBatchItem(item)]),
	);

	return {
		upserts: items
			.map((item) => toBatchItem(item))
			.filter(hasPageItemContent)
			.filter((item) => !sameItem(item, persistedById.get(item.id))),
		deletes: [...deletedIds].filter((id) => persistedById.has(id)),
	};
}

function hasBatchChanges(batch: PageItemBatchRequest) {
	return batch.upserts.length > 0 || batch.deletes.length > 0;
}

function mergeItems<T extends { id: string }>(
	current: readonly T[],
	incoming: readonly T[],
): T[] {
	const nextById = new Map(current.map((item) => [item.id, item]));
	for (const item of incoming) {
		nextById.set(item.id, item);
	}
	const currentIds = new Set(current.map((item) => item.id));
	return [
		...current.map((item) => nextById.get(item.id) ?? item),
		...incoming.filter((item) => !currentIds.has(item.id)),
	];
}

function mergeAcknowledgedItems(
	draft: readonly GridItem[],
	acknowledged: readonly GridItem[],
	batch: PageItemBatchRequest,
): GridItem[] {
	const sentById = new Map(batch.upserts.map((item) => [item.id, item]));
	const acknowledgedById = new Map(acknowledged.map((item) => [item.id, item]));

	return draft.map((item) => {
		const sentItem = sentById.get(item.id);
		const acknowledgedItem = acknowledgedById.get(item.id);
		if (
			!sentItem ||
			!acknowledgedItem ||
			!sameItem(toBatchItem(item), sentItem)
		) {
			return item;
		}

		return acknowledgedItem;
	});
}

async function patchPageItemsBatch(
	handle: string,
	batch: PageItemBatchRequest,
): Promise<PageItemBatchResponse> {
	const response = await fetch(
		`${getApiBaseUrl()}/pages/${encodeURIComponent(handle)}/batch`,
		{
			method: "PATCH",
			credentials: "include",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(batch),
		},
	);

	if (!response.ok) {
		throw new Error(`Page item batch failed with status ${response.status}.`);
	}

	return v.parse(pageItemBatchResponseSchema, await response.json());
}

export function useGridEditorStore({
	initialItems,
	handle,
	breakpoint,
	enabled = true,
	persistItems = true,
}: UseGridEditorStoreOptions) {
	const queryClient = useQueryClient();
	const [items, setItems] = useState<GridItem[]>(() =>
		initialItems.map(toGridItem),
	);
	const [status, setStatus] = useState<GridEditorStatus>("saved");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [autoFocusItemId, setAutoFocusItemId] = useState<string | null>(null);
	const draftRef = useRef(items);
	const persistedRef = useRef(items);
	const pendingRef = useRef<PageItemBatchRequest>({ upserts: [], deletes: [] });
	const deletedIdsRef = useRef<Set<string>>(new Set());
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const draftVersionRef = useRef(0);
	const stateVersionRef = useRef(0);
	const saveInFlightRef = useRef<Promise<SavePendingChangesResult> | null>(
		null,
	);
	const scheduleSaveRef = useRef<() => void>(() => {});

	useEffect(() => {
		const nextItems = initialItems.map(toGridItem);
		stateVersionRef.current += 1;
		draftVersionRef.current += 1;
		draftRef.current = nextItems;
		persistedRef.current = nextItems;
		pendingRef.current = { upserts: [], deletes: [] };
		deletedIdsRef.current = new Set();
		setItems(nextItems);
		setAutoFocusItemId(null);
		setStatus("saved");
		setErrorMessage(null);
	}, [initialItems]);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	const syncQueryCache = useCallback(
		(nextItems: readonly GridItem[]) => {
			const queryKey = getPageByHandleQueryOptions(handle).queryKey;
			queryClient.setQueryData(
				queryKey,
				(current: PageByHandleResponse | null | undefined) => {
					if (!current) return current;
					return {
						...current,
						items: nextItems.map(toPageItem),
					};
				},
			);
		},
		[handle, queryClient],
	);

	const savePendingChanges = useCallback(() => {
		if (!persistItems) {
			pendingRef.current = { upserts: [], deletes: [] };
			return Promise.resolve<SavePendingChangesResult>({ ok: true });
		}

		if (saveInFlightRef.current) return saveInFlightRef.current;

		const sentBatch = pendingRef.current;
		pendingRef.current = { upserts: [], deletes: [] };
		if (!hasBatchChanges(sentBatch)) {
			return Promise.resolve<SavePendingChangesResult>({ ok: true });
		}

		const stateVersion = stateVersionRef.current;
		const draftVersion = draftVersionRef.current;

		setStatus("saving");
		setErrorMessage(null);

		let request: Promise<SavePendingChangesResult> | null = null;
		request = (async (): Promise<SavePendingChangesResult> => {
			let shouldScheduleFollowUp = false;

			try {
				const response = await patchPageItemsBatch(handle, sentBatch);
				if (stateVersion !== stateVersionRef.current) return { ok: true };

				const sentIds = new Set(sentBatch.upserts.map((item) => item.id));
				const acknowledgedItems = response.items
					.map(toGridItem)
					.filter((item) => sentIds.has(item.id));
				persistedRef.current = mergeItems(
					persistedRef.current,
					acknowledgedItems,
				);
				persistedRef.current = persistedRef.current.filter(
					(item) => !sentBatch.deletes.includes(item.id),
				);
				for (const id of sentBatch.deletes) deletedIdsRef.current.delete(id);
				const nextDraft = mergeAcknowledgedItems(
					draftRef.current,
					acknowledgedItems,
					sentBatch,
				);
				draftRef.current = nextDraft;
				setItems(nextDraft);
				syncQueryCache(nextDraft);

				const nextBatch = createBatch(
					nextDraft,
					persistedRef.current,
					deletedIdsRef.current,
				);
				pendingRef.current = nextBatch;
				setStatus(hasBatchChanges(nextBatch) ? "dirty" : "saved");
				shouldScheduleFollowUp = hasBatchChanges(nextBatch);
				return { ok: true };
			} catch (error) {
				if (stateVersion !== stateVersionRef.current) return { ok: true };

				const nextBatch = createBatch(
					draftRef.current,
					persistedRef.current,
					deletedIdsRef.current,
				);
				pendingRef.current = nextBatch;
				const hasNewerDraft = draftVersion !== draftVersionRef.current;
				const saveError =
					error instanceof Error
						? error
						: new Error("Unknown grid update error");
				setErrorMessage(saveError.message);
				setStatus("error");
				shouldScheduleFollowUp = hasNewerDraft && hasBatchChanges(nextBatch);
				return { ok: false, error: saveError };
			} finally {
				if (request && saveInFlightRef.current === request) {
					saveInFlightRef.current = null;
				}
				if (shouldScheduleFollowUp) scheduleSaveRef.current();
			}
		})();

		saveInFlightRef.current = request;
		return request;
	}, [handle, persistItems, syncQueryCache]);

	const scheduleSave = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			void savePendingChanges();
		}, PAGE_AUTOSAVE_DEBOUNCE_MS);
	}, [savePendingChanges]);

	useEffect(() => {
		scheduleSaveRef.current = scheduleSave;
	}, [scheduleSave]);

	const commitItems = useCallback(
		(nextItems: GridItem[]) => {
			if (
				draftRef.current.length === nextItems.length &&
				draftRef.current.every((item, index) => item === nextItems[index])
			) {
				return;
			}
			draftVersionRef.current += 1;
			draftRef.current = nextItems;
			setItems(nextItems);
			syncQueryCache(nextItems);
			if (!persistItems) {
				setStatus("saved");
				setErrorMessage(null);
				return;
			}
			const nextBatch = createBatch(
				nextItems,
				persistedRef.current,
				deletedIdsRef.current,
			);
			pendingRef.current = nextBatch;
			const hasChanges = persistItems && hasBatchChanges(nextBatch);
			setStatus(hasChanges ? "dirty" : "saved");
			setErrorMessage(null);
			if (hasChanges) scheduleSave();
		},
		[persistItems, scheduleSave, syncQueryCache],
	);

	const dispatchCommand = useCallback(
		(command: GridEditorCommand | { type: "manage-link"; itemId: string }) => {
			if (!enabled) return;
			if (command.type === "manage-link") return;

			const currentItems = draftRef.current;
			if (command.type === "add-item") {
				const newItem = createGridItem({
					items: currentItems,
					itemType: command.itemType,
					url: command.url,
				});
				setAutoFocusItemId(
					command.itemType === "text" || command.itemType === "section"
						? newItem.id
						: null,
				);
				commitItems([...currentItems, newItem]);
				return;
			}
			if (command.type === "replace-layout") {
				try {
					validateLayout(command.layout, getColumns(command.breakpoint));
				} catch {
					return;
				}
				commitItems(
					mergeLayoutMapIntoItems(
						currentItems,
						command.breakpoint,
						command.layout,
					),
				);
				return;
			}
			const targetItem = currentItems.find(
				(item) => item.id === command.itemId,
			);
			if (!targetItem) return;

			if (command.type === "update-data") {
				commitItems(
					currentItems.map((item) =>
						item.id === command.itemId
							? ({
									...item,
									data: structuredClone(command.data) as typeof item.data,
								} as GridItem)
							: item,
					),
				);
				return;
			}

			if (command.type === "update-style") {
				commitItems(
					currentItems.map((item) =>
						item.id === command.itemId
							? {
									...item,
									style: { ...item.style, ...structuredClone(command.patch) },
								}
							: item,
					),
				);
				return;
			}

			if (command.type === "delete-item") {
				deletedIdsRef.current.add(command.itemId);
				commitItems(currentItems.filter((item) => item.id !== command.itemId));
				return;
			}

			if (command.type === "move-item") {
				const nextLayoutMap = resolveAxisAwareSwap(
					toLayoutMap(currentItems, breakpoint),
					command.itemId,
					command.layout,
					command.dragDelta,
					getColumns(breakpoint),
				);
				commitItems(
					mergeLayoutMapIntoItems(currentItems, breakpoint, nextLayoutMap),
				);
				return;
			}

			if (!getAllowedPresets(targetItem.type).includes(command.preset)) {
				return;
			}

			const nextLayoutMap = applyPresetToLayoutMap({
				layouts: toLayoutMap(currentItems, command.breakpoint ?? breakpoint),
				itemId: command.itemId,
				itemType: targetItem.type,
				preset: command.preset,
				breakpoint: command.breakpoint ?? breakpoint,
			});

			commitItems(
				mergeLayoutMapIntoItems(
					currentItems,
					command.breakpoint ?? breakpoint,
					nextLayoutMap,
				).map((item) =>
					item.id === command.itemId
						? {
								...item,
								preset: command.preset,
							}
						: item,
				),
			);
		},
		[breakpoint, commitItems, enabled],
	);

	const flushPendingChanges = useCallback(async () => {
		while (saveInFlightRef.current || hasBatchChanges(pendingRef.current)) {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}

			const result = await savePendingChanges();
			if (!result.ok) throw result.error;
		}
	}, [savePendingChanges]);

	const clearAutoFocusItem = useCallback((itemId: string) => {
		setAutoFocusItemId((current) => (current === itemId ? null : current));
	}, []);

	return {
		items,
		autoFocusItemId,
		clearAutoFocusItem,
		status,
		errorMessage,
		dispatchCommand,
		flushPendingChanges,
	};
}
