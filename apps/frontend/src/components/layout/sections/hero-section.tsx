import CTAButton from "@/components/auth/cta-button";

export default function HeroSection() {
	return (
		<section className="flex min-h-lvh flex-col gap-16 pt-40">
			<div className="flex flex-col items-center justify-center gap-12">
				<div className="flex flex-col gap-6 text-center">
          <h1 className="text-6xl/18 tracking-tighter text-fg-4 font-semibold md:text-balance max-w-2xl flex flex-col">
            <span>Experience-first</span>
            <span>link in bio</span>
					</h1>
					<h2 className="max-w-md text-lg text-primary/80 text-balance">
					  No more dashboard, just drag&drop all items that represent you.
					</h2>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-center gap-3">
				<CTAButton />
			</div>
		</section>
	);
}
