import type { HandleAvailabilityResponse } from "@sinabro/api";
import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader, XCircle } from "reicon-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { env } from "@/env";
import {
	checkPageHandleAvailability,
	createPage,
} from "@/lib/api/pages.functions";
import { invalidateSessionQuery } from "@/lib/api/session.functions";
import { getHandleAvailabilityStatus } from "@/lib/page/new-page-state";

const ROLE_OPTIONS = [
	{ value: "engineer", label: "Engineer" },
	{ value: "designer", label: "Designer" },
	{ value: "writer", label: "Writer" },
	{ value: "developer", label: "Developer" },
	{ value: "product-manager", label: "Product Manager" },
	{ value: "founder", label: "Founder" },
	{ value: "student", label: "Student" },
	{ value: "creator", label: "Creator" },
] as const;

const handleAvailabilityIcons = {
	checking: <Loader className="animate-spin size-full" />,
	available: <CheckCircle weight="Filled" className="size-full" />,
	duplicate: <XCircle weight="Filled" className="size-full" />,
};

export function CreatePageFlow({
	onCreated,
}: {
	onCreated: (handle: string) => void;
}) {
	const queryClient = useQueryClient();
	const [handle, setHandle] = useState("");
	const [role, setRole] = useState<string | null>(null);
	const [isRoleStep, setIsRoleStep] = useState(false);
	const [availability, setAvailability] =
		useState<HandleAvailabilityResponse | null>(null);
	const [isCheckingHandle, setIsCheckingHandle] = useState(false);
	const [isCreatingPage, setIsCreatingPage] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const handleStatus = useMemo(
		() => getHandleAvailabilityStatus(handle, availability, isCheckingHandle),
		[handle, availability, isCheckingHandle],
	);
	const HandleAvailabilityIcon =
		handleStatus.availabilityState === "idle"
			? null
			: handleAvailabilityIcons[handleStatus.availabilityState];

	useEffect(() => {
		setSubmitError(null);
		if (!handle.trim()) {
			setAvailability(null);
			setIsCheckingHandle(false);
			return;
		}

		let isCurrent = true;
		const timeoutId = window.setTimeout(async () => {
			setIsCheckingHandle(true);
			try {
				const result = await checkPageHandleAvailability({ data: { handle } });
				if (isCurrent) setAvailability(result);
			} catch {
				if (isCurrent) {
					setAvailability(null);
					setSubmitError("Could not check this handle. Try again.");
				}
			} finally {
				if (isCurrent) setIsCheckingHandle(false);
			}
		}, 400);

		return () => {
			isCurrent = false;
			window.clearTimeout(timeoutId);
		};
	}, [handle]);

	async function createPageWithRole(selectedRole: string | null) {
		if (isCreatingPage) return;

		setIsCreatingPage(true);
		setSubmitError(null);
		try {
			const response = await createPage({
				data: {
					handle: handleStatus.normalizedHandle,
					name: null,
					role: selectedRole,
				},
			});
			invalidateSessionQuery(queryClient);
			onCreated(response.page.handle);
		} catch {
			setSubmitError("Could not create your page. Try again.");
		} finally {
			setIsCreatingPage(false);
		}
	}

	function onHandleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!handleStatus.canCreatePage || isCreatingPage) return;

		setSubmitError(null);
		setIsRoleStep(true);
	}

	function onRoleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void createPageWithRole(role);
	}

	return (
		<div
			className="t-page-slide t-login-page-slide"
			data-page={isRoleStep ? "2" : "1"}
		>
			<form
				className="t-page flex flex-col gap-8"
				data-page-id="1"
				onSubmit={onHandleSubmit}
			>
				<div className="flex flex-col items-center gap-1">
					<h1 className="text-2xl font-semibold text-balance">
						First, Claim your handle
					</h1>
					<h2 className="text-base text-primary">
						Choose a unique handle for your public page.
					</h2>
				</div>
				<div className="flex flex-col gap-2">
					<Field className="gap-2">
						<InputGroup className="h-11 rounded-lg bg-secondary text-base max-w-full">
							<InputGroupInput
								aria-describedby="handle-status handle-error"
								aria-invalid={Boolean(handleStatus.error)}
								id="handle"
								name="handle"
								onChange={(event) => setHandle(event.target.value)}
								placeholder="your-handle"
								type="text"
								value={handle}
								autoComplete="off"
								className="placeholder:text-base! placeholder:text-muted-foreground/50 placeholder:font-normal pl-0.5! text-base!"
							/>
							<InputGroupAddon align="inline-start" className="text-base! pl-4">
								{env.VITE_APP_DOMAIN}/
							</InputGroupAddon>
							<InputGroupAddon
								align="inline-end"
								data-state={handleStatus.availabilityState}
								id="handle-status"
								className="size-9 data-[state=available]:text-green-500 data-[state=duplicate]:text-destructive"
							>
								{HandleAvailabilityIcon}
							</InputGroupAddon>
						</InputGroup>
						{submitError ? (
							<FieldError className="text-center text-xs">
								{submitError}
							</FieldError>
						) : null}
					</Field>
					<Button
						type="submit"
						variant="default"
						size="lg"
						className="h-12 rounded-lg text-base font-medium"
						disabled={
							!handleStatus.canCreatePage || isCheckingHandle || isCreatingPage
						}
					>
						{isCreatingPage ? <Loader className="animate-spin" /> : "Grab it"}
					</Button>
				</div>
			</form>
			<form
				className="t-page flex flex-col gap-8"
				data-page-id="2"
				onSubmit={onRoleSubmit}
			>
				<div className="flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-semibold">What do you do?</h1>
					<h2 className="text-base text-primary text-balance">
						Choose a role to personalize your page.
					</h2>
				</div>
				<div className="flex flex-col gap-5">
					<fieldset className="flex flex-wrap justify-center gap-2">
						<legend className="sr-only">Roles</legend>
						{ROLE_OPTIONS.map((option) => {
							const isSelected = role === option.value;
							return (
								<button
									type="button"
									key={option.value}
									aria-pressed={isSelected}
									onClick={() => setRole(option.value)}
									className="rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									<Badge
										variant={isSelected ? "default" : "outline"}
										className="py-4 px-3 text-sm shadow-xs"
									>
										{option.label}
									</Badge>
								</button>
							);
						})}
					</fieldset>
					{submitError ? (
						<FieldError className="text-center text-xs">
							{submitError}
						</FieldError>
					) : null}
					<div className="flex flex-row-reverse gap-1">
						<Button
							type="submit"
							variant="default"
							size="lg"
							className="h-12 rounded-lg text-base font-medium flex-2"
							disabled={isCreatingPage}
						>
							{isCreatingPage ? (
								<Loader className="animate-spin" />
							) : (
								"Continue"
							)}
						</Button>
						<Button
							type="button"
							variant="secondary"
							className="h-12 text-muted-foreground rounded-lg text-base flex-1"
							disabled={isCreatingPage}
							onClick={() => void createPageWithRole(null)}
						>
							Skip
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
