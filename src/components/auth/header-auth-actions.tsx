import { Link, useNavigate } from "@tanstack/react-router";
import { UserRoundIcon, WalletCardsIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/shared/utils";

function SignedInAccountButton({
	user,
}: {
	user: NonNullable<ReturnType<typeof authClient.useSession>["data"]>["user"];
}) {
	const navigate = useNavigate();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size={"icon-lg"}
						className={"overflow-hidden"}
					>
						<Avatar className={"size-9"}>
							<AvatarImage
								src={user.image ?? undefined}
								alt={user.name ?? "User"}
							/>
							<AvatarFallback className={"bg-secondary"} />
						</Avatar>
					</Button>
				}
			/>
			<DropdownMenuContent align="end" sideOffset={12} className={"min-w-60"}>
				<div className="flex items-center gap-3 px-2 py-2 pb-4">
					<Avatar className={"size-8 shrink-0"}>
						<AvatarImage
							src={user.image ?? undefined}
							alt={user.name ?? "User"}
						/>
						<AvatarFallback className={"bg-secondary"}>
							{(user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex flex-col">
						<span className="truncate text-sm font-medium">
							{user.name ?? "User"}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{user.email ?? ""}
						</span>
					</div>
				</div>
				<DropdownMenuGroup>
					<DropdownMenuItem
						className={"flex items-center justify-between gap-2 font-normal"}
						onClick={() => {
							void navigate({
								to: "/account",
							});
						}}
					>
						<span>Account</span>
						<UserRoundIcon className="size-4 shrink-0" />
					</DropdownMenuItem>
					<DropdownMenuItem
						className={"flex items-center justify-between gap-2 font-normal"}
						onClick={() => {
							void navigate({
								to: "/account/billing",
							});
						}}
					>
						<span>Billing</span>
						<WalletCardsIcon className="size-4 shrink-0" />
					</DropdownMenuItem>
					<DropdownMenuItem
						className={"font-normal"}
						onClick={async () => {
							await authClient.signOut({
								fetchOptions: {
									onSuccess: async () => {
										await navigate({ to: "/" });
									},
								},
							});
						}}
					>
						Log out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function AccountButton() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="h-9 w-9 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />
		);
	}

	if (!session?.user) {
		return (
			<Button
				render={<Link to="/log-in" search={{ redirect: "/dashboard" }} />}
				nativeButton={false}
				variant="ghost"
			>
				Log in
			</Button>
		);
	}

	return <SignedInAccountButton user={session.user} />;
}

export function JoinForFreeButton({ className }: { className?: string }) {
	return (
		<Button
			render={<Link to="/dashboard" />}
			nativeButton={false}
			variant="default"
			size="lg"
			className={cn("h-12 rounded-xl px-5 text-base font-normal", className)}
		>
			Join for free
		</Button>
	);
}

export default function HeaderAuthActions() {
	return (
		<div className="flex items-center gap-3">
			<JoinForFreeButton />
			<AccountButton />
		</div>
	);
}
