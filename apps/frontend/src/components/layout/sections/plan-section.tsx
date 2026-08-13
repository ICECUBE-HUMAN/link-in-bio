import { Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";

const PRO_PRODUCT_IDS = {
	monthly: "prod_1M7K6uOQxjMu006ypD04R",
	yearly: "prod_6oaKuPlsztLLAQt3Y5BlqD",
} as const;

type BillingPeriod = keyof typeof PRO_PRODUCT_IDS;

const PRO_PRICES: Record<
	BillingPeriod,
	{ label: string; price: string; suffix: string }
> = {
	monthly: { label: "Monthly", price: "$6", suffix: "/ month" },
	yearly: { label: "Yearly", price: "$60", suffix: "/ year" },
};

const FREE_FEATURES = [
	"1 page",
	"All core widgets",
	"Wide & compact layouts",
	"Today's page views",
	"Grabbin subdomain",
	"Grabbin branding",
];

const PRO_FEATURES = [
	"3 pages",
	"All core widgets",
	"Wide & compact layouts",
	"Today's page views",
	"Custom domain",
	"Remove Grabbin branding",
];

export default function PlanSection() {
	const navigate = useNavigate();
	const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
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

			const { data, error } = await authClient.creem.createCheckout({
				productId: PRO_PRODUCT_IDS[billingPeriod],
			});

			if (error || !data?.url) {
				setCheckoutError("Checkout could not be started. Please try again.");
				return;
			}

			window.location.href = data.url;
		} catch {
			setCheckoutError("Checkout could not be started. Please try again.");
		} finally {
			setIsCheckingOut(false);
		}
	};

	return (
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
								{(Object.keys(PRO_PRICES) as BillingPeriod[]).map((period) => (
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
								))}
							</fieldset>
							<Button
								size="lg"
								variant="brand"
								className="w-full rounded-lg"
								onClick={startCheckout}
								disabled={isCheckingOut}
							>
								{isCheckingOut
									? "Opening checkout…"
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
	features: string[];
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
					{features.map((feature) => (
						<li key={feature} className="flex items-center gap-2">
							<Check
								className="size-4 shrink-0 text-brand"
								aria-hidden="true"
							/>
							<span>{feature}</span>
						</li>
					))}
				</ul>
			</div>
			<div className="mt-auto">{action}</div>
		</article>
	);
}
