import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account/billing")({
	component: BillingPage,
});

function BillingPage() {
	return (
		<div className="space-y-6">
			<section className="flex flex-col gap-6">
				<div className="flex flex-row items-center justify-between gap-4">
					<header className="flex items-center gap-3">
						<h2 className="text-lg font-medium">Plan</h2>
						<Badge
							variant="secondary"
							className="rounded-sm px-1 text-xs! font-normal text-muted-foreground"
						>
							Free trial
						</Badge>
					</header>

					<Button type="button" className="rounded-xl">
						Upgrade plan
					</Button>
				</div>
				{/* Plan usage data */}
			</section>
		</div>
	);
}
