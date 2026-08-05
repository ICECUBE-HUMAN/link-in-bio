import { SpinnerGapIcon } from "@phosphor-icons/react";
import { IconGoogle, IconXTwitter } from "nucleo-social-media";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { CheckCircle } from "reicon-react";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { authClient } from "@/lib/auth/auth-client";
import { DEFAULT_SITE_NAME } from "@/lib/seo/metadata";

type LogInSectionProps = {
	redirectTo: string;
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

function ButtonContentTransition({
	idle,
	isPending,
	pending,
}: {
	idle: ReactNode;
	isPending: boolean;
	pending: ReactNode;
}) {
	return (
		<span
			className="t-button-content"
			data-state={isPending ? "pending" : "idle"}
		>
			<span
				className="t-button-content__item t-button-content__item--idle"
				aria-hidden={isPending}
			>
				{idle}
			</span>
			<span
				className="t-button-content__item t-button-content__item--pending"
				aria-hidden={!isPending}
			>
				{pending}
			</span>
		</span>
	);
}

export default function LogInSection({ redirectTo }: LogInSectionProps) {
	const [pendingProvider, setPendingProvider] = useState<
		"google" | "twitter" | "magic-link" | null
	>(null);
	const [email, setEmail] = useState("");
	const [magicLinkSent, setMagicLinkSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const emailInputRef = useRef<HTMLInputElement>(null);
	const emailWrapRef = useRef<HTMLDivElement>(null);
	const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const getCallbackURL = () =>
		new URL(redirectTo, window.location.origin).toString();

	function clearEmailError() {
		if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
		if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
		shakeTimerRef.current = null;
		revertTimerRef.current = null;
		emailWrapRef.current?.classList.remove("is-error");
		emailInputRef.current?.classList.remove("is-error", "is-shaking");
	}

	function showEmailError(message: string) {
		setError(message);
		const wrap = emailWrapRef.current;
		const input = emailInputRef.current;
		if (!wrap || !input) return;

		wrap.classList.add("is-error");
		input.classList.add("is-error");
		input.classList.remove("is-shaking");
		void input.offsetWidth;
		input.classList.add("is-shaking");

		const rootStyles = getComputedStyle(document.documentElement);
		const motionMs = (name: string, fallback: number) => {
			const value = Number.parseFloat(rootStyles.getPropertyValue(name));
			return Number.isFinite(value) ? value : fallback;
		};
		const shakeMs =
			motionMs("--shake-dur-a", 80) * 2 + motionMs("--shake-dur-b", 60) * 2;
		shakeTimerRef.current = setTimeout(() => {
			input.classList.remove("is-shaking");
			shakeTimerRef.current = null;
		}, shakeMs + 20);

		if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
		revertTimerRef.current = setTimeout(() => {
			wrap.classList.remove("is-error");
			input.classList.remove("is-error");
			revertTimerRef.current = null;
		}, motionMs("--revert-hold", 3000) + shakeMs);
	}

	async function handleSocialSignIn(provider: "google" | "twitter") {
		setError(null);
		setPendingProvider(provider);
		try {
			await authClient.signIn.social({
				provider,
				callbackURL: getCallbackURL(),
			});
		} finally {
			setPendingProvider(null);
		}
	}

	async function handleMagicLinkSignIn(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const input = emailInputRef.current;
		if (!input) return;
		if (!input.validity.valid) {
			showEmailError(
				input.validity.valueMissing
					? "Please enter your email address."
					: "Please enter a valid email address.",
			);
			return;
		}
		clearEmailError();
		setError(null);
		setPendingProvider("magic-link");
		try {
			const { error: signInError } = await authClient.signIn.magicLink({
				email,
				callbackURL: getCallbackURL(),
				errorCallbackURL: getCallbackURL(),
				newUserCallbackURL: getCallbackURL(),
			});
			if (signInError) {
				showEmailError(signInError.message ?? "Could not send the magic link.");
				return;
			}
			setMagicLinkSent(true);
		} finally {
			setPendingProvider(null);
		}
	}

	return (
		<main className="relative mx-auto flex min-h-dvh w-full items-center justify-center overflow-y-auto overscroll-none px-5 py-6">
			<section className="w-full max-w-xs flex flex-col gap-10 relative">
				<form
					className="t-page-slide t-login-page-slide"
					data-page={magicLinkSent ? "2" : "1"}
					noValidate
					onSubmit={(event) => void handleMagicLinkSignIn(event)}
				>
					<div className="t-page min-w-0" data-page-id="1">
						<header className="flex flex-col gap-1 items-center">
							<h1 className="text-2xl font-semibold">
								Log in to{" "}
								<span className="text-brand">{DEFAULT_SITE_NAME}</span>
							</h1>
							<p className="text-sm text-muted-foreground">
								Create your beautiful page in seconds.
							</p>
						</header>

						<div className="mt-10 space-y-0">
							<div ref={emailWrapRef} className="t-input-wrap space-y-1.5">
								<InputGroup className="h-12 rounded-lg">
									<InputGroupInput
										ref={emailInputRef}
										type="email"
										value={email}
										onChange={(event) => {
											setEmail(event.target.value);
											clearEmailError();
											setError(null);
										}}
										placeholder="Email"
										aria-label="Email address"
										aria-invalid={Boolean(error)}
										autoComplete="off"
										required
										disabled={pendingProvider !== null}
										className="t-input h-12 text-base"
									/>
									<InputGroupAddon align="inline-end" className="pr-2">
										<InputGroupButton
											type="submit"
											variant="outline"
											size="sm"
											className="h-10 rounded-md px-4 font-medium shadow-xs border-border/60 text-primary hover:bg-background"
											disabled={pendingProvider !== null}
										>
											<ButtonContentTransition
												isPending={pendingProvider === "magic-link"}
												idle="Send a link"
												pending={
													<>
														<SpinnerGapIcon
															className="size-5 animate-spin"
															aria-hidden="true"
														/>
														<span className="sr-only">Sending…</span>
													</>
												}
											/>
										</InputGroupButton>
									</InputGroupAddon>
								</InputGroup>
								<p
									className="t-error-msg min-h-4 text-left text-xs text-destructive/80"
									role="alert"
								>
									{error}
								</p>
							</div>

							{/*<div className="uppercase text-muted-foreground text-sm text-center">
								or
							</div>*/}
							<div className="flex flex-row gap-2 pt-3">
								<Button
									variant={"secondary"}
									size="lg"
									className="h-12 w-full rounded-lg text-base font-medium flex-1 text-gray-bright"
									disabled={pendingProvider !== null}
									onClick={() => void handleSocialSignIn("google")}
								>
									<ButtonContentTransition
										isPending={pendingProvider === "google"}
										idle={
											<>
												<IconGoogle className="size-5" />
												Google
											</>
										}
										pending={
											<>
												<SpinnerGapIcon
													className="size-5 animate-spin"
													aria-hidden="true"
												/>
												<span className="sr-only">Signing in with Google…</span>
											</>
										}
									/>
								</Button>
								<Button
									variant={"secondary"}
									size="lg"
									className="h-12 w-full rounded-lg text-base font-medium flex-1 text-gray-bright"
									disabled={pendingProvider !== null}
									onClick={() => void handleSocialSignIn("twitter")}
								>
									<ButtonContentTransition
										isPending={pendingProvider === "twitter"}
										idle={
											<>
												<IconXTwitter />X
											</>
										}
										pending={
											<>
												<SpinnerGapIcon
													className="size-5 animate-spin"
													aria-hidden="true"
												/>
												<span className="sr-only">Signing in with X…</span>
											</>
										}
									/>
								</Button>
							</div>
						</div>
					</div>

					<div
						className="t-page flex flex-col items-center gap-8"
						data-page-id="2"
						aria-live="polite"
						aria-busy={pendingProvider === "magic-link"}
					>
						<div className="flex flex-col items-center gap-2">
							<SuccessCheck visible={magicLinkSent} />
							<div className="flex flex-col items-center gap-1 text-center">
								<h1 className="text-2xl font-semibold">Check your email</h1>
								<p className="text-sm text-muted-foreground">
									We sent a sign-in link to{" "}
									<span className="text-primary">{email}</span>. It expires in 5
									minutes.
								</p>
								<p
									className="t-success-error min-h-4 text-xs text-destructive/80"
									data-state={error ? "visible" : "hidden"}
									role="alert"
								>
									{error}
								</p>
							</div>
						</div>

						<div className="flex w-full flex-col items-center gap-0.5">
							<Button
								type="submit"
								variant="secondary"
								size="lg"
								className="w-full max-w-2xs rounded-md font-medium text-muted-foreground"
								disabled={pendingProvider !== null}
							>
								<ButtonContentTransition
									isPending={pendingProvider === "magic-link"}
									idle="Resend link"
									pending={
										<>
											<SpinnerGapIcon
												className="size-4 animate-spin"
												aria-hidden="true"
											/>
											Sending…
										</>
									}
								/>
							</Button>
							<Button
								type="button"
								size="sm"
								variant="link"
								onClick={() => {
									clearEmailError();
									setError(null);
									setMagicLinkSent(false);
								}}
								className="text-muted-foreground text-xs rounded-2xl font-medium no-underline! hover:text-primary"
							>
								Use a different email
							</Button>
						</div>
					</div>
				</form>
			</section>
		</main>
	);
}
