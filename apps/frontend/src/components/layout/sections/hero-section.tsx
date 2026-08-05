import CTAButton from "@/components/auth/cta-button";
import TryDemoButton from "@/components/auth/demo-button";

export default function HeroSection() {
	return (
    <section className="flex min-h-svh flex-col items-center justify-center gap-16 max-w-4xl mx-auto p-4">
      <div className="flex flex-col justify-between items-start gap-12 md:flex-row md:items-end md:gap-0 w-full">
        <div className="flex flex-col items-center justify-center gap-12">
          <header className="flex flex-col gap-6">
            <aside>
              <div className="size-8 rounded-full surface-line">
                <img src="/logo512.png" alt="Logo" className="size-full rounded-[inherit] object-cover" />
              </div>
            </aside>
            <h1 className="text-3xl md:text-4xl tracking-tight leading-9 font-medium md:text-balance flex flex-col">
              <p>A Link in Bio</p>
              <p className="flex flex-col">
                <span className="text-brand">the most beautiful and clean </span>
                <span>you've ever seen</span>
              </p>
  					</h1>
  					<h2 className="max-w-md text-base font-medium text-gray-bright text-balance tracking-tight leading-tight md:text-lg">
              <p>Forget dashboards</p>
              <p>Just drag and drop your identity</p>
  					</h2>
  				</header>
  			</div>
  			<div className="flex flex-wrap items-center justify-center gap-2">
          <CTAButton title="Join for free" />
  				<TryDemoButton />
  			</div>
      </div>
		</section>
	);
}
