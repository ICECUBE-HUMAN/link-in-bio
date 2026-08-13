import type { BillingPeriod } from "@sinabro/api";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, LoaderCircle } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

const PRO_PRICES: Record<
	BillingPeriod,
	{ label: string; price: string; suffix: string }
> = {
	monthly: { label: "Monthly", price: "$6", suffix: "/ month" },
	yearly: { label: "Yearly", price: "$60", suffix: "/ year" },
};

type PlanFeature = {
	label: string;
	status?: "in-progress";
};

const FREE_FEATURES: PlanFeature[] = [
	{ label: "1 page" },
	{ label: "All core widgets" },
	{ label: "Wide & compact layouts" },
	{ label: "Today's page views", status: "in-progress" },
];

const PRO_FEATURES: PlanFeature[] = [
	{ label: "3 pages" },
	{ label: "All core widgets" },
	{ label: "Wide & compact layouts" },
	{ label: "Today's page views", status: "in-progress" },
	{ label: "Custom domain", status: "in-progress" },
];

export default function PlanSection() {
	const navigate = useNavigate();
	const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
	const selectedPrice = PRO_PRICES[billingPeriod];

	const startCheckout = async () => {
		setCheckoutError(null);
		setIsCheckingOut(true);

		try {
			const { data: session } = await authClient.getSession();

			if (!session?.user) {
				await navigate({ to: "/log-in" });
				return;
			}

			const statusResponse = await fetch(`${getApiBaseUrl()}/billing/status`, {
				credentials: "include",
			});
			if (!statusResponse.ok) {
				throw new Error("Billing status could not be loaded.");
			}
			const status = (await statusResponse.json()) as {
				hasAccess?: boolean;
				productId?: string;
			};

			if (status.hasAccess && status.productId) {
				setHasActiveSubscription(true);
				const { data, error } = await authClient.creem.createPortal();
				if (error || !data?.url) {
					throw new Error("Billing portal could not be opened.");
				}
				window.location.href = data.url;
				return;
			}

			const checkoutResponse = await fetch(
				`${getApiBaseUrl()}/billing/checkout`,
				{
					method: "POST",
					credentials: "include",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ period: billingPeriod }),
				},
			);
			if (!checkoutResponse.ok) {
				setCheckoutError("Billing could not be started. Please try again.");
				return;
			}
			const { url } = (await checkoutResponse.json()) as {
				url?: string;
			};
			if (!url) {
				setCheckoutError("Billing could not be started. Please try again.");
				return;
			}

			window.location.href = url;
		} catch {
			setCheckoutError("Billing could not be started. Please try again.");
		} finally {
			setIsCheckingOut(false);
		}
	};

	return (
		<>
			<section
				className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-24"
				aria-labelledby="plans-heading"
			>
				<header className="flex flex-col gap-4 md:max-w-xl">
					<Badge className="w-fit rounded-md bg-brand/10! p-3 font-medium text-brand">
						Simple pricing
					</Badge>
					<h2
						id="plans-heading"
						className="text-3xl font-medium leading-tight tracking-tight md:text-4xl"
					>
						Choose the plan that fits you
					</h2>
					<p className="text-base font-medium leading-tight tracking-tight text-gray-bright md:text-lg">
						Start free, then upgrade when your page is ready to grow.
					</p>
				</header>

				<div className="grid gap-4 md:grid-cols-2">
					<PlanCard
						name="Free"
						price="$0"
						suffix="forever"
						description="A beautiful page to share who you are."
						features={FREE_FEATURES}
						action={
							<Button
								size="lg"
								variant="outline"
								className="w-full rounded-lg"
								nativeButton={false}
								render={<Link to="/log-in">Get started</Link>}
							/>
						}
					/>

					<PlanCard
						name="Pro"
						price={selectedPrice.price}
						suffix={selectedPrice.suffix}
						description="More pages and your own domain."
						features={PRO_FEATURES}
						highlighted
						action={
							<div className="flex flex-col gap-3">
								<fieldset className="flex w-fit rounded-full bg-muted p-1">
									<legend className="sr-only">Billing period</legend>
									{(Object.keys(PRO_PRICES) as BillingPeriod[]).map(
										(period) => (
											<button
												key={period}
												type="button"
												aria-pressed={billingPeriod === period}
												onClick={() => setBillingPeriod(period)}
												className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
													billingPeriod === period
														? "bg-background text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												{PRO_PRICES[period].label}
											</button>
										),
									)}
								</fieldset>
								<Button
									size="lg"
									variant="brand"
									className="w-full rounded-lg"
									onClick={startCheckout}
									disabled={isCheckingOut}
								>
									{isCheckingOut
										? "Opening billing…"
										: hasActiveSubscription
											? "Manage billing"
											: `Choose Pro · ${selectedPrice.label}`}
								</Button>
								{checkoutError ? (
									<p className="text-sm text-destructive" role="alert">
										{checkoutError}
									</p>
								) : null}
							</div>
						}
					/>
				</div>
			</section>
		</>
	);
}

function PlanCard({
	name,
	price,
	suffix,
	description,
	features,
	action,
	highlighted = false,
}: {
	name: string;
	price: string;
	suffix: string;
	description: string;
	features: PlanFeature[];
	action: ReactNode;
	highlighted?: boolean;
}) {
	return (
		<article
			className={`flex h-full flex-col gap-8 rounded-3xl border p-6 shadow-sm ${
				highlighted ? "border-brand/50 bg-brand/[.04]" : "border-border bg-card"
			}`}
		>
			<div className="flex flex-col gap-6">
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-col gap-2">
						<h3 className="text-xl font-medium tracking-tight">{name}</h3>
						<p className="text-sm font-medium text-gray-bright">
							{description}
						</p>
					</div>
					{highlighted ? (
						<Badge className="rounded-md bg-brand/10! text-brand">
							Popular
						</Badge>
					) : null}
				</div>
				<div className="flex items-baseline gap-2">
					<span className="text-4xl font-medium tracking-tight">{price}</span>
					<span className="text-sm font-medium text-gray-bright">{suffix}</span>
				</div>
				<ul className="flex flex-col gap-3 text-sm font-medium">
					{features.map((feature) => {
						const FeatureIcon =
							feature.status === "in-progress" ? LoaderCircle : Check;

						return (
							<li key={feature.label} className="flex items-center gap-2">
								<FeatureIcon
									className={`size-4 shrink-0 ${
										feature.status === "in-progress"
											? "text-muted-foreground"
											: "text-brand"
									}`}
									aria-hidden="true"
								/>
								<span>
									{feature.status === "in-progress" ? (
										<span className="sr-only">In progress: </span>
									) : null}
									{feature.label}
								</span>
							</li>
						);
					})}
				</ul>
			</div>
			<div className="mt-auto">{action}</div>
		</article>
	);
}
