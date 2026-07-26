import CTAButton from "@/components/auth/cta-button";
import { DEFAULT_APP_LOGO, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";

export default function HeroSection() {
	return (
		<section className="flex min-h-lvh flex-col items-center gap-16 justify-center">
			<div className="flex flex-col items-center justify-center gap-12">
				<img
					src={DEFAULT_APP_LOGO}
					alt={DEFAULT_SITE_NAME}
					className="size-20 rounded-md object-contain"
				/>
				<div className="flex max-w-2xl flex-col items-center justify-center gap-6 text-center">
					<h1 className="text-5xl font-semibold md:text-7xl">
						Beautiful link in bio
					</h1>
					<h2 className="max-w-md text-lg text-gray-bright text-balance">
						Share everything you do, all in one place, create your page that
						shows you.
					</h2>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-center gap-3">
				<CTAButton />
			</div>
		</section>
	);
}
