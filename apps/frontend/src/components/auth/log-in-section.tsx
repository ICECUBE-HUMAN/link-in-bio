import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { IconGoogle, IconXTwitter } from "nucleo-social-media";
import { env } from "@/env";

type LogInSectionProps = {
	redirectTo: string;
};

export default function LogInSection({
	redirectTo,
}: LogInSectionProps) {
	const [pendingProvider, setPendingProvider] = useState<
		"google" | "twitter" | null
	>(null);

	async function handleSocialSignIn(provider: "google" | "twitter") {
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

	return (
		<main className="mx-auto flex min-h-lvh w-full max-w-md justify-center items-center overscroll-none px-5">
  		<section className="w-full max-w-sm flex flex-col gap-10 relative">
  			<header className="flex flex-col gap-1 items-center">
            <h1 className="text-3xl font-semibold">
              Join {env.VITE_APP_TITLE}
            </h1>
       			<p className="text-base text-muted-foreground">
        				Create your beautiful page in seconds.
       			</p>
  			</header>
  
  			<div className="space-y-8">
  						<div className="flex flex-row gap-2">
              <Button
                  variant={'secondary'}
  								size="lg"
  								className="h-12 w-full rounded-xl text-base font-medium flex-1"
  								disabled={pendingProvider !== null}
  								onClick={() => void handleSocialSignIn("google")}
  							>
  								{pendingProvider === "google" ? (
  									<SpinnerGapIcon className="size-5 animate-spin" />
  								) : (
  									<>
  										<IconGoogle className="size-5" />
  										Google
  									</>
  								)}
            </Button>
            <Button
                variant={'default'}
								size="lg"
								className="h-12 w-full rounded-xl text-base font-medium flex-1"
								disabled={pendingProvider !== null}
								onClick={() => void handleSocialSignIn("twitter")}
							>
								{pendingProvider === "twitter" ? (
									<SpinnerGapIcon className="size-5 animate-spin" />
								) : (
									<>
										<IconXTwitter />
										X
									</>
								)}
							</Button>
  						</div>
  			</div>
  		</section>
		</main>
	);
}