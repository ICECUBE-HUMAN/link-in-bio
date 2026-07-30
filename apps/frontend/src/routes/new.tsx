import type { HandleAvailabilityResponse } from "@sinabro/api";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Confetti from "react-confetti";
import { Check, CheckCircle, Loader, XCircle } from "reicon-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
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
import {
	getSessionQueryOptions,
	invalidateSessionQuery,
} from "@/lib/api/session.functions";
import { getHandleAvailabilityStatus } from "@/lib/page/new-page-state";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";
import { Link } from "@tanstack/react-router";

const NEW_PAGE_DESCRIPTION = "Create your page.";

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

export const Route = createFileRoute("/new")({
	beforeLoad: async ({ context }) => {
		const { data: session } = await context.queryClient.ensureQueryData(
			getSessionQueryOptions(),
		);

		if (!session?.user) {
			throw redirect({
				to: "/log-in",
				search: {
					redirect: "/new",
				},
			});
		}

		if (session.user.primaryPageId) {
			throw redirect({
				to: "/",
			});
		}

		return {};
	},
	head: () =>
		createSeo({
			title: "Create your page",
			description: NEW_PAGE_DESCRIPTION,
			canonicalPath: "/new",
			jsonLd: createWebPageJsonLd({
				title: "New page",
				description: NEW_PAGE_DESCRIPTION,
				path: "/new",
			}),
		}),
	component: NewPage,
});

const handleAvailabilityIcons = {
	checking: <Loader className="animate-spin size-full" />,
	available: <CheckCircle weight="Filled" className="size-full" />,
	duplicate: <XCircle weight="Filled" className="size-full" />,
};

function SuccessCheck({ visible }: { visible: boolean }) {
	return (
		<span
			className="t-success-check text-green-500"
			data-state={visible ? "in" : undefined}
			aria-hidden="true"
		>
			<CheckCircle weight="Filled" className="size-12" />
		</span>
	);
}

function NewPage() {
	const { queryClient } = Route.useRouteContext();
	const [handle, setHandle] = useState("");
	const [role, setRole] = useState<string | null>(null);
	const [isRoleStep, setIsRoleStep] = useState(false);
	const [createdHandle, setCreatedHandle] = useState<string | null>(null);
	const [showConfetti, setShowConfetti] = useState(false);
	const [viewport, setViewport] = useState({ width: 0, height: 0 });
	const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
		"idle",
	);
	const copyResetRef = useRef<number | null>(null);
	const [availability, setAvailability] =
		useState<HandleAvailabilityResponse | null>(null);
	const [isCheckingHandle, setIsCheckingHandle] = useState(false);
	const [isCreatingPage, setIsCreatingPage] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	useEffect(() => {
		const updateViewport = () => {
			setViewport({ width: window.innerWidth, height: window.innerHeight });
		};

		updateViewport();
		window.addEventListener("resize", updateViewport);

		return () => window.removeEventListener("resize", updateViewport);
	}, []);

	useEffect(() => {
		if (!createdHandle) return;

		setShowConfetti(true);
		const timeoutId = window.setTimeout(() => {
			setShowConfetti(false);
		}, 4000);

		return () => window.clearTimeout(timeoutId);
	}, [createdHandle]);

	useEffect(() => {
		return () => {
			if (copyResetRef.current !== null) {
				window.clearTimeout(copyResetRef.current);
			}
		};
	}, []);

	async function copyPageUrl() {
		if (!createdHandle) return;

		try {
			await navigator.clipboard.writeText(
				`${env.VITE_APP_DOMAIN}/${createdHandle}`,
			);
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
				const result = await checkPageHandleAvailability({
					data: { handle },
				});

				if (isCurrent) {
					setAvailability(result);
				}
			} catch {
				if (isCurrent) {
					setAvailability(null);
					setSubmitError("Could not check this handle. Try again.");
				}
			} finally {
				if (isCurrent) {
					setIsCheckingHandle(false);
				}
			}
		}, 400);

		return () => {
			isCurrent = false;
			window.clearTimeout(timeoutId);
		};
	}, [handle]);

	const createPageWithRole = async (selectedRole: string | null) => {
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
			setCreatedHandle(response.page.handle);
		} catch {
			setSubmitError("Could not create your page. Try again.");
		} finally {
			setIsCreatingPage(false);
		}
	};

	const onHandleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!handleStatus.canCreatePage || isCreatingPage) {
			return;
		}

		setSubmitError(null);
		setIsRoleStep(true);
	};

	const onRoleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void createPageWithRole(role);
	};

	return (
		<main className="mx-auto flex min-h-lvh w-full items-center justify-center overscroll-none px-8">
			{showConfetti && viewport.width > 0 ? (
				<Confetti
					className="pointer-events-none fixed inset-0 z-50"
					width={viewport.width}
					height={viewport.height}
					numberOfPieces={180}
					recycle={false}
					run
					gravity={0.35}
					initialVelocityX={{ min: -2, max: 2 }}
					initialVelocityY={{ min: 4, max: 10 }}
					tweenDuration={3500}
					confettiSource={{ x: 0, y: 0, w: viewport.width, h: 0 }}
					onConfettiComplete={() => setShowConfetti(false)}
				/>
			) : null}
			<section className="w-full max-w-sm">
				<div
					className="t-page-slide t-login-page-slide"
					data-page={createdHandle ? "3" : isRoleStep ? "2" : "1"}
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
										onChange={(event) => {
											setHandle(event.target.value);
										}}
										placeholder="your-handle"
										type="text"
										value={handle}
										autoComplete="off"
										className="placeholder:text-base! placeholder:text-muted-foreground/50 placeholder:font-normal pl-0.5! text-base!"
									/>
									<InputGroupAddon
										align="inline-start"
										className="text-base! pl-4"
									>
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
									!handleStatus.canCreatePage ||
									isCheckingHandle ||
									isCreatingPage
								}
							>
								{isCreatingPage ? (
									<span className="flex items-center gap-2">
										<Loader className="animate-spin" />
									</span>
								) : (
									"Grab it"
								)}
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
							<div
								className="flex flex-wrap justify-center gap-2"
								role="group"
								aria-label="Roles"
							>
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
							</div>

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

					<div
						className="t-page flex flex-col items-center gap-8"
						data-page-id="3"
						aria-live="polite"
					>
						<div className="flex flex-col items-center gap-2">
							<SuccessCheck visible={Boolean(createdHandle)} />
							<div className="flex flex-col items-center gap-1 text-center">
								<h1 className="text-2xl font-semibold">Looking good!</h1>
								<h2 className="text-base text-primary text-balance">
									Now you can customize your profile and share it!
								</h2>
							</div>
						</div>
						<div className="flex w-full flex-col gap-1.5">
							<div className="rounded-lg bg-secondary h-12 px-3 pr-1.5 text-base max-w-full flex justify-between items-center">
								<div>
									<span className="text-muted-foreground font-medium">
										{env.VITE_APP_DOMAIN}/
									</span>
									<span className="text-primary font-medium">
										{createdHandle}
									</span>
								</div>
								<Button
									type="button"
									variant="outline"
									className="t-copy-button h-9 rounded-lg px-3 border-border/60 shadow-xs text-primary hover:bg-background"
									data-state={copyState}
									onClick={() => void copyPageUrl()}
								>
									<span className="t-copy-feedback" aria-live="polite">
										<span className="t-copy-icon" aria-hidden="true">
											<Check weight="Filled" className="size-4" />
										</span>
										<span className="t-copy-labels">
											<span className="t-copy-label t-copy-label-idle">
												Copy Link
											</span>
											<span className="t-copy-label t-copy-label-copied">
												{copyState === "error" ? "Copy failed" : "Copied"}
											</span>
										</span>
									</span>
								</Button>
							</div>

							<Button
								nativeButton={false}
								variant={"brand"}
								size={"lg"}
								className={"h-12 rounded-lg text-base"}
								render={
									<Link to="/$handle" params={{ handle: createdHandle! }}>
										Go to profile
									</Link>
								}
							/>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
