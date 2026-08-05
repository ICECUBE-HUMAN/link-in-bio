import CTAButton from "@/components/auth/cta-button";
import TryDemoButton from "@/components/auth/demo-button";

export default function CTASection() {
	return (
		<section className="h-[50vh] flex flex-col justify-center items-center gap-16 p-4 max-w-4xl mx-auto">
			<div className="flex flex-col gap-12 w-full items-start md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col gap-4 items-start">
					<h2 className="text-3xl font-medium md:text-4xl tracking-tight leading-8">
						Create your page <span className="text-brand">in seconds</span>
					</h2>
					<p className="text-base font-medium text-gray-bright text-balance tracking-tight flex flex-col">
						<span>Create a page that reflects who you are</span>
						<span>— not just a list of links</span>
					</p>
				</div>
				<div className="flex flex-wrap items-center justify-center gap-2">
					<CTAButton title="Get started" />
					<TryDemoButton />
				</div>
			</div>
		</section>
	);
}
