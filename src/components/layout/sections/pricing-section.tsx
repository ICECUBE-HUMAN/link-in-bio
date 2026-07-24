import { PricingCard } from "@/components/layout/pricing/pricing-card";
import { PricingPlansCard } from "../pricing/pricing-plans-card";

export default function PricingSection() {
	return (
		<section className="flex flex-col items-center gap-16 py-24">
			<div className="flex flex-col items-center gap-6 text-center">
				<h2 className="text-3xl font-semibold md:text-5xl">Simple pricing</h2>
				<div className="font-light text-gray-bright text-lg">
					<p>Keep it simple with a single plan.</p>
					<p>Pay only for what you use based on monthly events.</p>
				</div>
			</div>

      <PricingCard />
			<PricingPlansCard />
		</section>
	);
}
