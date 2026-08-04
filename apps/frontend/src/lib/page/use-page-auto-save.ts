import type {
	MyPageResponse,
	PageByHandleResponse,
	PageResponse,
	UpdatePageRequest,
} from "@sinabro/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { MY_PAGE_QUERY_KEY } from "@/lib/api/pages.functions";
import { updatePage } from "@/lib/api/pages-api";
import { type EditablePageFields, getChangedPageFields } from "./page-update";

export const PAGE_AUTOSAVE_DEBOUNCE_MS = 1000;

export type PageAutoSaveStatus = "saved" | "dirty" | "saving" | "error";

type UsePageAutoSaveOptions = {
	page: PageResponse;
	handle: string;
	enabled?: boolean;
	persist?: boolean;
};

export function getEditablePageFields(page: PageResponse): EditablePageFields {
	return {
		name: page.name,
		bio: page.bio,
		image: page.image,
		imageSource: page.imageSource,
		imageCrop: page.imageCrop,
	};
}

function updateCachedPage<T extends { page: PageResponse | null }>(
	current: T | undefined,
	changes: UpdatePageRequest,
): T | undefined {
	if (!current?.page) return current;

	return {
		...current,
		page: { ...current.page, ...changes },
	};
}

export function usePageAutoSave({
	page,
	handle,
	enabled = true,
	persist = true,
}: UsePageAutoSaveOptions) {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState<EditablePageFields>(() =>
		getEditablePageFields(page),
	);
	const [status, setStatus] = useState<PageAutoSaveStatus>("saved");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const draftRef = useRef(draft);
	const persistedRef = useRef<EditablePageFields>(draft);
	const pendingRef = useRef<UpdatePageRequest>({});
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const saveSequenceRef = useRef(0);
	const { name, bio, image, imageSource, imageCrop } = page;
	const pageMutation = useMutation({
		mutationFn: (changes: UpdatePageRequest) => updatePage(handle, changes),
		onMutate: async (changes) => {
			await Promise.all([
				queryClient.cancelQueries({ queryKey: ["pages", handle] }),
				queryClient.cancelQueries({ queryKey: MY_PAGE_QUERY_KEY }),
			]);

			const previousPage = queryClient.getQueryData<PageByHandleResponse>([
				"pages",
				handle,
			]);
			const previousMyPage =
				queryClient.getQueryData<MyPageResponse>(MY_PAGE_QUERY_KEY);
			applyOptimisticUpdate(changes);

			return { previousPage, previousMyPage };
		},
		onError: (_error, _changes, context) => {
			if (context?.previousPage) {
				queryClient.setQueryData(["pages", handle], context.previousPage);
			}
			if (context?.previousMyPage) {
				queryClient.setQueryData(MY_PAGE_QUERY_KEY, context.previousMyPage);
			}
		},
	});

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	useEffect(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		const nextDraft = { name, bio, image, imageSource, imageCrop };
		pendingRef.current = {};
		saveSequenceRef.current += 1;
		draftRef.current = nextDraft;
		persistedRef.current = nextDraft;
		setDraft(nextDraft);
		setStatus("saved");
		setErrorMessage(null);
	}, [name, bio, image, imageSource, imageCrop]);

	const applyOptimisticUpdate = useCallback(
		(changes: UpdatePageRequest) => {
			queryClient.setQueryData(
				["pages", handle],
				(current: PageByHandleResponse | undefined) =>
					updateCachedPage(current, changes),
			);
			queryClient.setQueryData(
				MY_PAGE_QUERY_KEY,
				(current: MyPageResponse | undefined) =>
					updateCachedPage(current, changes),
			);
		},
		[handle, queryClient],
	);

	const commitFields = useCallback(
		(changes: Partial<EditablePageFields>) => {
			if (!enabled) return;

			const nextDraft = {
				...draftRef.current,
				...changes,
			};
			const nextPersisted = {
				...persistedRef.current,
				...changes,
			};
			draftRef.current = nextDraft;
			persistedRef.current = nextPersisted;
			setDraft(nextDraft);
			pendingRef.current = getChangedPageFields(nextDraft, nextPersisted);
			applyOptimisticUpdate(changes);
			setStatus(Object.keys(pendingRef.current).length > 0 ? "dirty" : "saved");
		},
		[applyOptimisticUpdate, enabled],
	);

	const savePendingChanges = useCallback(async () => {
		const changes = pendingRef.current;
		pendingRef.current = {};
		if (Object.keys(changes).length === 0) return;
		if (!persist) {
			setStatus("saved");
			return;
		}

		const sequence = ++saveSequenceRef.current;
		setStatus("saving");
		setErrorMessage(null);

		let response: Awaited<ReturnType<typeof updatePage>>;
		try {
			response = await pageMutation.mutateAsync(changes);
		} catch (error) {
			console.error("[page-auto-save] update request failed", error);
			if (sequence === saveSequenceRef.current) {
				setErrorMessage(
					error instanceof Error ? error.message : "Unknown update error",
				);
				setStatus("error");
			}
			return;
		}

		persistedRef.current = {
			name: response.page.name,
			bio: response.page.bio,
			image: response.page.image,
			imageSource: response.page.imageSource,
			imageCrop: response.page.imageCrop,
		};

		const latestChanges = getChangedPageFields(
			draftRef.current,
			persistedRef.current,
		);

		try {
			queryClient.setQueryData(
				["pages", handle],
				(current: PageByHandleResponse | undefined) =>
					updateCachedPage(current, { ...response.page, ...latestChanges }),
			);
			queryClient.setQueryData(
				MY_PAGE_QUERY_KEY,
				(current: MyPageResponse | undefined) =>
					updateCachedPage(current, { ...response.page, ...latestChanges }),
			);

			if (sequence === saveSequenceRef.current) {
				setStatus(
					Object.keys(pendingRef.current).length > 0 ? "dirty" : "saved",
				);
			}
		} catch (error) {
			console.error("[page-auto-save] cache update failed", error);
			void queryClient.invalidateQueries({ queryKey: ["pages", handle] });
			void queryClient.invalidateQueries({ queryKey: MY_PAGE_QUERY_KEY });
			if (sequence === saveSequenceRef.current) {
				setErrorMessage(
					error instanceof Error ? error.message : "Unknown cache error",
				);
				setStatus("error");
			}
		}
	}, [handle, pageMutation, persist, queryClient]);

	const scheduleSave = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			void savePendingChanges();
		}, PAGE_AUTOSAVE_DEBOUNCE_MS);
	}, [savePendingChanges]);

	const updateFields = useCallback(
		(changes: Partial<EditablePageFields>) => {
			if (!enabled) return;

			const nextDraft = {
				...draftRef.current,
				...changes,
			} as EditablePageFields;
			draftRef.current = nextDraft;
			setDraft(nextDraft);

			pendingRef.current = getChangedPageFields(
				nextDraft,
				persistedRef.current,
			);
			if (!persist) {
				persistedRef.current = nextDraft;
				pendingRef.current = {};
				applyOptimisticUpdate(changes);
				setStatus("saved");
				return;
			}
			setStatus("dirty");
			scheduleSave();
		},
		[applyOptimisticUpdate, enabled, persist, scheduleSave],
	);

	const updateField = useCallback(
		<Field extends keyof EditablePageFields>(
			field: Field,
			value: EditablePageFields[Field],
		) => updateFields({ [field]: value } as Partial<EditablePageFields>),
		[updateFields],
	);

	return {
		commitFields,
		draft,
		errorMessage,
		status,
		updateField,
		updateFields,
	};
}
