import CTAButton from "@/components/auth/cta-button";
import TryDemoButton from "@/components/auth/demo-button";

export default function HeroSection() {
	return (
		<section className="flex min-h-svh flex-col items-center justify-center gap-16 max-w-4xl mx-auto">
			<div className="flex flex-col justify-between items-center gap-12 w-full">
				<div className="flex flex-col items-center justify-center gap-12">
          <header className="flex flex-col gap-8 items-center">
            <div className="size-20">
              <img src={'/favicon.svg'} alt="grabbin" className="size-full object-cover"/>
            </div>
            <h2 className="flex flex-col items-center text-4xl font-semibold md:text-5xl">
              <p>Bring everything.</p>
              <p>Be yourself.</p>
            </h2>
            <div>
              <h1 className="text-lg font-medium text-center text-balance md:text-xl">A cleaner, more beautiful link in bio.</h1>
              <h3 className="text-lg font-medium text-center text-balance text-gray-bright md:text-xl">Turn one link into your world.</h3>
            </div>
            
						{/*<h1 className="text-3xl md:text-6xl tracking-tight font-medium md:text-balance flex flex-col text-center">
							<p>A Link in Bio</p>
							<p className="flex flex-col">
								<span className="text-primary">
									the most beautiful and clean{" "}
								</span>
								<span>you've ever seen</span>
							</p>
						</h1>*/}
					</header>
				</div>
				<div className="flex flex-col items-center justify-center gap-2 w-3xs md:w-xs">
					<CTAButton title="Join for free" />
					<TryDemoButton />
				</div>
			</div>
		</section>
	);
}
