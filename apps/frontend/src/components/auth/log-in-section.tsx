import { SpinnerGapIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { GithubIcon } from "@/components/icons/github";
import { GoogleplusIcon } from "@/components/icons/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";

type LogInSectionProps = {
	layoutMode: "centered" | "split";
	redirectTo: string;
};

export default function LogInSection({
	layoutMode,
	redirectTo,
}: LogInSectionProps) {
	const [email, setEmail] = useState("");
	const [pendingProvider, setPendingProvider] = useState<
		"google" | "github" | null
	>(null);
	const hasInputValue = email.trim().length > 0;

	function handleResetInputs() {
		setEmail("");
	}

	async function handleSocialSignIn(provider: "google" | "github") {
		setPendingProvider(provider);
		try {
			await authClient.signIn.social({
				provider,
				callbackURL: new URL(redirectTo, window.location.origin).toString(),
			});
		} finally {
			setPendingProvider(null);
		}
	}

	const content = (
		<section className="w-full max-w-sm space-y-12 relative">
			<header className="space-y-5 text-center">
				<img src="/logo512.png" alt="Logo" className="mx-auto size-16" />
				<div className="flex flex-col items-center gap-2">
					<h1 className="text-4xl font-bold">Welcome back</h1>
				</div>
			</header>

			<div className="space-y-8">
				<div>
					<Input
						id="log-in-email"
						name="email"
						type="email"
						autoComplete="off"
						placeholder="Email"
						required
						className="h-12"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>

					{hasInputValue ? (
						<>
							<Button
								type="button"
								variant="link"
								className="mb-4 p-0 text-xs font-medium text-[#768CFF] underline underline-offset-4"
								onClick={handleResetInputs}
							>
								Continue with social account
							</Button>
							<Button
								render={<Link to={redirectTo} />}
								nativeButton={false}
								size="lg"
								className="h-12 w-full rounded-xl text-base font-bold"
							>
								Log in
							</Button>
						</>
					) : null}
				</div>

				{hasInputValue ? null : (
					<>
						<p className="text-sm font-bold uppercase">or</p>
						<div className="flex flex-col gap-2">
							<Button
								size="lg"
								className="h-12 w-full rounded-xl bg-[#1d9bf0] text-base font-medium hover:bg-[#1a90de]"
								disabled={pendingProvider !== null}
								onClick={() => void handleSocialSignIn("google")}
							>
								{pendingProvider === "google" ? (
									<SpinnerGapIcon className="size-5 animate-spin" />
								) : (
									<>
										<GoogleplusIcon className="size-5 fill-current stroke-0" />
										Continue with Google
									</>
								)}
							</Button>
							<Button
								variant="secondary"
								size="lg"
								className="h-12 w-full rounded-xl text-base font-medium"
								disabled={pendingProvider !== null}
								onClick={() => void handleSocialSignIn("github")}
							>
								{pendingProvider === "github" ? (
									<SpinnerGapIcon className="size-5 animate-spin" />
								) : (
									<>
										<GithubIcon className="size-5 fill-current stroke-0" />
										Continue with GitHub
									</>
								)}
							</Button>
						</div>
					</>
				)}
			</div>
		</section>
	);

	if (layoutMode === "split") {
		return (
			<main className="min-h-lvh overscroll-none lg:grid lg:grid-cols-2">
				<section className="flex min-h-lvh items-center justify-center px-5 py-24 lg:px-12">
					{content}
				</section>
				<aside
					className="hidden h-lvh bg-muted/30 lg:block"
					aria-label="Image or video area"
				>
					<img
						src="https://i.pinimg.com/736x/ce/df/ca/cedfca6f61a36b2f61492ddc17ad31af.jpg"
						alt=""
						className="h-full w-full"
					/>
				</aside>
			</main>
		);
	}

	return (
		<main className="mx-auto flex min-h-lvh w-full max-w-md items-center overscroll-none px-5 py-24 pt-40">
			{content}
		</main>
	);
}
