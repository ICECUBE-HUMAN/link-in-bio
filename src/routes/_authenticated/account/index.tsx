import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheckIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

export const Route = createFileRoute("/_authenticated/account/")({
	component: AccountPage,
});

function AccountPage() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="rounded-4xl border bg-card p-6 text-sm text-muted-foreground">
				Loading account...
			</div>
		);
	}

	if (!session?.user) {
		return (
			<div className="rounded-4xl border bg-card p-6 text-sm text-muted-foreground">
				No session.
			</div>
		);
	}

	const initials = (session.user.name ?? session.user.email ?? "U")
		.trim()
		.slice(0, 1)
		.toUpperCase();

	return (
		<div className="space-y-12">
			<section className="space-y-6">
				<div className="flex items-center gap-4">
					<div className="flex flex-col items-center gap-6">
						<Avatar className="relative size-10 overflow-visible rounded-[inherit]">
							<AvatarImage
								src={session.user.image ?? undefined}
								alt={session.user.name ?? "Avatar"}
								className="rounded-full"
							/>
							<AvatarFallback className="rounded-[inherit] bg-secondary/80">
								{initials}
							</AvatarFallback>
							<BadgeCheckIcon className="absolute -right-2 -top-2 fill-foreground stroke-background" />
						</Avatar>
					</div>

					<div className="flex flex-col">
						<p>{session.user.name}</p>
						<p className="text-sm text-muted-foreground">
							{session.user.email}
						</p>
					</div>
				</div>
			</section>

			<section className="flex items-center justify-between">
				<header>
					<h2 className="text-base font-medium">Delete account</h2>
					<p className="text-xs text-muted-foreground max-w-52">
						Permanently delete your account and all related data.
					</p>
				</header>

				<div>
					<Button type="button" variant="destructive" className="rounded-xl">
						Delete account
					</Button>
				</div>
			</section>
		</div>
	);
}
