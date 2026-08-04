import type {
	HandleAvailabilityResponse,
	MyPageResponse,
	PageByHandleResponse,
	PageResponse,
} from "@sinabro/api";
import { isReservedPageHandle, pageHandleSchema } from "@sinabro/api";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeftIcon } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle, Gear, Loader, XCircle } from "reicon-react";
import { createUISFX } from "uisfx";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { env } from "@/env";
import {
	checkPageHandleAvailability,
	getPageByHandleQueryOptions,
	MY_PAGE_QUERY_KEY,
} from "@/lib/api/pages.functions";
import { updatePage } from "@/lib/api/pages-api";
import { clearSessionQuery } from "@/lib/api/session.functions";
import { authClient } from "@/lib/auth/auth-client";
import { getHandleAvailabilityStatus } from "@/lib/page/new-page-state";
import { SharedLayoutBg } from "../motion/shared-layout-bg";

type SettingsView = "menu" | "delete" | "handle";

const DELETE_CONFIRMATION_CLICKS = 3;

type PageSettingsMenuProps = {
	page: PageResponse;
	onChanged: (page: PageResponse) => void;
	localOnly?: boolean;
};

const handleAvailabilityIcons = {
	checking: <Loader className="animate-spin size-full" />,
	available: <CheckCircle weight="Filled" className="size-full" />,
	duplicate: <XCircle weight="Filled" className="size-full" />,
};

export function PageSettingsMenu({
	page,
	onChanged,
	localOnly = false,
}: PageSettingsMenuProps) {
	const ui = createUISFX({
		pack: "minimal",
		volume: 2,
	});

	const queryClient = useQueryClient();
	const [view, setView] = useState<SettingsView>("menu");
	const [open, setOpen] = useState(false);
	const [isHandleSuccess, setIsHandleSuccess] = useState(false);

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) {
					setView("menu");
					setIsHandleSuccess(false);
				}
			}}
		>
			<PopoverTrigger
				render={<Button variant="ghost" size="icon-sm" />}
				aria-label="Settings"
				className="text-muted-foreground/80 rounded-md"
			>
				<Gear weight="Filled" />
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={12}
				className={`${isHandleSuccess || view === "handle" ? "w-88" : view === "delete" ? "w-80" : "w-64"} t-resize overflow-hidden ${view === "delete" ? "p-4 rounded-4xl" : "p-2 rounded-2xl"} beautiful-shadow  bg-background`}
			>
				<div
					className="t-page-slide t-resize"
					data-page={view === "menu" ? "1" : "2"}
					data-view={view}
					data-success={isHandleSuccess ? "true" : undefined}
				>
					<section className="t-page" data-page-id="1">
						<SharedLayoutBg className="px-5">
							{localOnly ? (
								<div className="flex h-15 items-center text-sm text-muted-foreground">
									Demo mode · changes stay in this browser
								</div>
							) : null}
							<button
								type="button"
								className="w-full flex flex-col items-start justify-center rounded-lg font-normal h-15 gap-0"
								onClick={() => setView("handle")}
							>
								<span>Change handle</span>
								<span className="text-muted-foreground/80">/{page.handle}</span>
							</button>
							{!localOnly ? (
								<button
									type="button"
									className="flex items-center w-full justify-start rounded-lg font-normal h-15"
									onClick={async () => {
										ui.play("disconnect");
										const { error } = await authClient.signOut();
										if (error) return;

										await clearSessionQuery(queryClient);
										queryClient.resetQueries({
											queryKey: MY_PAGE_QUERY_KEY,
											exact: true,
										});
										setOpen(false);
									}}
								>
									Log out
								</button>
							) : null}
							{!localOnly ? (
								<button
									type="button"
									className="flex items-center w-full justify-start rounded-lg font-normal h-15 text-gray-bright"
									onClick={() => setView("delete")}
								>
									Delete Account
								</button>
							) : null}
						</SharedLayoutBg>
					</section>
					<section className="t-page p-1" data-page-id="2">
						{view === "delete" ? (
							<DeleteAccountView onBack={() => setView("menu")} />
						) : view === "handle" ? (
							<ChangeHandleView
								page={page}
								localOnly={localOnly}
								isActive={view === "handle"}
								ui={ui}
								onBack={() => {
									setIsHandleSuccess(false);
									setView("menu");
								}}
								onChanged={onChanged}
								onSuccessChange={setIsHandleSuccess}
							/>
						) : null}
					</section>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function BackButton({ onBack }: { onBack: () => void }) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={onBack}
			aria-label="Back"
			className={"rounded-md"}
		>
			<ChevronLeftIcon className="stroke-2 size-5" />
		</Button>
	);
}

function DeleteAccountView({ onBack }: { onBack: () => void }) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [isVerificationSent, setIsVerificationSent] = useState(false);
	const [deleteConfirmationClicks, setDeleteConfirmationClicks] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const deleteProgress = deleteConfirmationClicks / DELETE_CONFIRMATION_CLICKS;
	const deleteButtonLabel =
		deleteConfirmationClicks === DELETE_CONFIRMATION_CLICKS
			? "Come back anytime!"
			: deleteConfirmationClicks > 0
				? deleteConfirmationClicks === DELETE_CONFIRMATION_CLICKS - 1
					? "Almost there"
					: "One more step"
				: "Begin account deletion";

	async function handleDelete() {
		setIsDeleting(true);
		setError(null);
		try {
			const result = await authClient.deleteUser({
				callbackURL: new URL("/", window.location.origin).toString(),
			});
			if (result.error) {
				setError(result.error.message ?? "Could not send the deletion email.");
				return;
			}
			setIsVerificationSent(true);
		} catch {
			setError("Could not send the deletion email.");
		} finally {
			setIsDeleting(false);
		}
	}

	function handleDeleteClick() {
		if (deleteConfirmationClicks < DELETE_CONFIRMATION_CLICKS) {
			setDeleteConfirmationClicks((clicks) =>
				Math.min(clicks + 1, DELETE_CONFIRMATION_CLICKS),
			);
			return;
		}

		void handleDelete();
	}

	return (
		<div
			className="flex h-full flex-col justify-between gap-8"
			data-verification-sent={isVerificationSent ? "true" : undefined}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-3">
				{isVerificationSent ? (
					<p className="text-base text-balance text-primary">
						Your inbox has the final step. Confirm when you’re ready, and we’ll
						take care of the rest.
						<span className="mt-4 block">
							See you again, whenever you’re ready.
						</span>
					</p>
				) : (
					<>
						<h3 className="font-semibold text-xl">Leaving alreday?</h3>
						<div className="text-base text-balance text-primary">
							<p>Ready to move on?</p>
							<p>
								We’ll send one last confirmation before your account and page
								are permanently removed.
							</p>
						</div>
						{error ? <p className="text-xs text-destructive">{error}</p> : null}
						<div className="mt-auto flex flex-col items-start gap-2">
							<Button
								variant="destructive"
								size="lg"
								className="relative w-full overflow-hidden rounded-lg h-12 text-base"
								disabled={isDeleting}
								onClick={handleDeleteClick}
							>
								<span className="relative z-0">
									{isDeleting ? (
										<Loader weight="Filled" className="animate-spin size-5" />
									) : (
										deleteButtonLabel
									)}
								</span>
								<span
									aria-hidden="true"
									className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-red-500 text-primary-foreground transition-[clip-path] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
									style={{
										clipPath: `inset(0 ${(1 - deleteProgress) * 100}% 0 0)`,
									}}
								>
									{isDeleting ? (
										<Loader weight="Filled" className="animate-spin size-5" />
									) : (
										deleteButtonLabel
									)}
								</span>
							</Button>
							<Button
								type="button"
								variant="secondary"
								size="lg"
								className="w-full h-12 rounded-lg text-base text-muted-foreground"
								onClick={onBack}
							>
								Cancel
							</Button>
						</div>
					</>
				)}
			</div>
			{isVerificationSent ? (
				<div className="pt-4">
					<p className="text-sm italic text-muted-foreground">
						With care,
						<br />
						The founder
					</p>
				</div>
			) : null}
		</div>
	);
}

function ChangeHandleView({
	page,
	isActive,
	ui,
	onBack,
	onChanged,
	onSuccessChange,
	localOnly,
}: {
	page: PageResponse;
	isActive: boolean;
	ui: ReturnType<typeof createUISFX>;
	onBack: () => void;
	onChanged: (page: PageResponse) => void;
	onSuccessChange: (isSuccess: boolean) => void;
	localOnly: boolean;
}) {
	const queryClient = useQueryClient();
	const inputRef = useRef<HTMLInputElement>(null);
	const [currentHandle, setCurrentHandle] = useState(page.handle);
	const [handle, setHandle] = useState(page.handle);
	const [availability, setAvailability] =
		useState<HandleAvailabilityResponse | null>(null);
	const [isChecking, setIsChecking] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const status = useMemo(
		() => getHandleAvailabilityStatus(handle, availability, isChecking),
		[handle, availability, isChecking],
	);
	const HandleAvailabilityIcon =
		status.availabilityState === "idle"
			? null
			: handleAvailabilityIcons[status.availabilityState];

	useEffect(() => {
		if (isActive) inputRef.current?.focus();
	}, [isActive]);

	useEffect(() => {
		setError(null);
		if (handle.trim().toLowerCase() === currentHandle) {
			setAvailability(null);
			setIsChecking(false);
			return;
		}
		if (!handle.trim()) {
			setAvailability(null);
			setIsChecking(false);
			return;
		}
		if (localOnly) {
			const normalizedHandle = handle.trim().toLowerCase();
			const isValid = v.safeParse(pageHandleSchema, handle).success;
			const isReserved = isReservedPageHandle(normalizedHandle);
			setAvailability({
				handle: normalizedHandle,
				available: isValid && !isReserved,
				reason: !isValid ? "invalid" : isReserved ? "reserved" : null,
			});
			setIsChecking(false);
			return;
		}
		let isCurrent = true;
		const timer = window.setTimeout(async () => {
			setIsChecking(true);
			try {
				const result = await checkPageHandleAvailability({ data: { handle } });
				if (isCurrent) setAvailability(result);
			} catch {
				if (isCurrent) {
					setAvailability(null);
					setError("Could not check this handle.");
				}
			} finally {
				if (isCurrent) setIsChecking(false);
			}
		}, 350);
		return () => {
			isCurrent = false;
			window.clearTimeout(timer);
		};
	}, [currentHandle, handle, localOnly]);

	useEffect(() => {
		onSuccessChange(isSuccess);
	}, [isSuccess, onSuccessChange]);

	async function submit(event: FormEvent) {
		event.preventDefault();
		if (!status.canCreatePage || handle.trim().toLowerCase() === currentHandle)
			return;
		setIsSaving(true);
		setError(null);
		try {
			if (localOnly) {
				const nextHandle = handle.trim().toLowerCase();
				const nextPage = { ...page, handle: nextHandle };
				setCurrentHandle(nextHandle);
				setHandle(nextHandle);
				setAvailability({
					handle: nextHandle,
					available: true,
					reason: null,
				});
				onChanged(nextPage);
				setIsSuccess(true);
				return;
			}
			const result = await updatePage(currentHandle, { handle });
			setCurrentHandle(result.page.handle);
			setHandle(result.page.handle);
			setAvailability({
				handle: result.page.handle,
				available: true,
				reason: null,
			});
			const previousPage = queryClient.getQueryData<PageByHandleResponse>(
				getPageByHandleQueryOptions(currentHandle).queryKey,
			);
			queryClient.removeQueries({
				queryKey: getPageByHandleQueryOptions(currentHandle).queryKey,
				exact: true,
			});
			queryClient.setQueryData(
				getPageByHandleQueryOptions(result.page.handle).queryKey,
				() =>
					({
						page: result.page,
						items: previousPage?.items ?? [],
					}) satisfies PageByHandleResponse,
			);
			queryClient.setQueryData<MyPageResponse>(MY_PAGE_QUERY_KEY, {
				page: result.page,
			});
			onChanged(result.page);
			setIsSuccess(true);
			// The success state owns the temporary confirmation UI.
		} catch {
			setError("Could not change this handle.");
		} finally {
			setIsSaving(false);
		}
	}

	if (isSuccess) {
		return <SuccessHandleView handle={currentHandle} ui={ui} />;
	}

	return (
		<form
			className="flex flex-col gap-3 h-full justify-between"
			onSubmit={(event) => void submit(event)}
		>
			<div className="flex items-center gap-1">
				<BackButton onBack={onBack} />
				<h3 className="font-medium text-base">Change handle</h3>
			</div>

			<Field className="gap-2">
				<InputGroup className="h-11 rounded-lg">
					<InputGroupInput
						ref={inputRef}
						aria-describedby="handle-status handle-error"
						aria-invalid={Boolean(status.error || error)}
						id="change-handle"
						name="handle"
						onChange={(event) => {
							ui.play("typing", {
								volume: 0.5,
							});
							setHandle(event.target.value);
							setAvailability(null);
							setError(null);
						}}
						placeholder="your-handle"
						type="text"
						value={handle}
						autoComplete="off"
						className="placeholder:text-base! placeholder:text-muted-foreground/50 placeholder:font-normal pl-0.5! text-base!"
					/>
					<InputGroupAddon
						align="inline-start"
						className="text-base! pl-4 font-normal"
					>
						{env.VITE_APP_DOMAIN}/
					</InputGroupAddon>
					<InputGroupAddon
						align="inline-end"
						data-state={status.availabilityState}
						id="handle-status"
						className="size-10 data-[state=available]:text-green-500 data-[state=duplicate]:text-destructive pr-1"
					>
						{HandleAvailabilityIcon}
					</InputGroupAddon>
				</InputGroup>

				<Button
					type="submit"
					variant={"brand"}
					size="lg"
					className={"rounded-lg h-12 text-base"}
					disabled={
						isSaving ||
						isChecking ||
						!status.canCreatePage ||
						handle.trim().toLowerCase() === currentHandle
					}
				>
					{isSaving ? <Loader className="animate-spin" /> : "Update handle"}
				</Button>
			</Field>
		</form>
	);
}

function SuccessHandleView({
	handle,
	ui,
}: {
	handle: string;
	ui: ReturnType<typeof createUISFX>;
}) {
	const checkRef = useRef<HTMLSpanElement>(null);
	const copyResetRef = useRef<number | null>(null);
	const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
		"idle",
	);

	useEffect(() => {
		const path = checkRef.current?.querySelector("path");
		if (!path) return;
		const length = Math.ceil(path.getTotalLength()) + 1;
		path.style.strokeDasharray = String(length);
		path.style.strokeDashoffset = String(length);
	}, []);

	useEffect(() => {
		return () => {
			if (copyResetRef.current !== null) {
				window.clearTimeout(copyResetRef.current);
			}
		};
	}, []);

	async function copyLink() {
		ui.play("copy");
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopyState("copied");
		} catch {
			setCopyState("error");
		}
		if (copyResetRef.current !== null) {
			window.clearTimeout(copyResetRef.current);
		}
		copyResetRef.current = window.setTimeout(() => {
			setCopyState("idle");
			copyResetRef.current = null;
		}, 1400);
	}

	return (
		<div className="relative flex min-h-80 flex-col items-center justify-center gap-6 text-center p-1">
			<div className="flex flex-col gap-2 items-center">
				<span
					ref={checkRef}
					className="t-success-check text-green-500"
					data-state="in"
					aria-hidden="true"
				>
					<CheckCircle weight="Filled" className="size-12" />
				</span>
				<span className="font-medium text-base">Successfully changed!</span>
			</div>

			<div className="w-full space-y-2">
				<div className="flex items-center justify-center bg-secondary/80 h-11 p-2 text-center w-full rounded-md">
					<span className="text-muted-foreground/80">
						{env.VITE_APP_DOMAIN}/
					</span>
					<span>{handle}</span>
				</div>
				<Button
					type="button"
					variant="secondary"
					className="t-copy-button w-full rounded-lg h-12"
					data-state={copyState}
					onClick={() => void copyLink()}
				>
					<span className="t-copy-feedback" aria-live="polite">
						<span className="t-copy-icon" aria-hidden="true">
							<Check weight="Filled" className="size-4" />
						</span>
						<span className="t-copy-labels">
							<span className="t-copy-label t-copy-label-idle">Copy Link</span>
							<span className="t-copy-label t-copy-label-copied">
								{copyState === "error" ? "Copy failed" : "Copied"}
							</span>
						</span>
					</span>
				</Button>
			</div>
		</div>
	);
}
