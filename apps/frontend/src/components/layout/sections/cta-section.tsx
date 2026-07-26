import CTAButton from "@/components/auth/cta-button";

export default function CTASection() {
	return (
		<section className="h-[40vh] flex flex-col justify-center items-center gap-16">
			<div className="rounded-[2.5rem] max-w-3xl p-12 sm:p-20 sm:px-40 flex flex-col items-center gap-8">
				<div className="flex flex-col gap-6 items-center text-center max-w-md">
					<h2 className="text-3xl font-semibold md:text-4xl text-balance">
						Just make your own
					</h2>
					<p className="font-normal text-base text-gray-bright text-balance"></p>
				</div>
				<div className="flex flex-row justify-center gap-3">
					<CTAButton title="Get started" />
				</div>
			</div>
		</section>
	);
}
