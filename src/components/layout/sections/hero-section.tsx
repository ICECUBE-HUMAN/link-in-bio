import { DEFAULT_APP_LOGO, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";
import { JoinForFreeButton } from "@/components/auth/header-auth-actions";
import { DemoButton, PricingButton } from "./cta-buttons";
import { AnnouncementBadge } from "../shell/announcement";

export default function HeroSection() {
	return (
		<section className="flex min-h-lvh flex-col items-center gap-16 justify-center">
      <div className="flex flex-col items-center justify-center gap-12">
        <AnnouncementBadge />
				<img
					src={DEFAULT_APP_LOGO}
					alt={DEFAULT_SITE_NAME}
					className="size-20 rounded-md object-contain"
        />
				<div className="flex max-w-2xl flex-col items-center justify-center gap-6 text-center">
					<h1 className="text-5xl font-semibold md:text-7xl">
						Discover real-world design inspiration.
					</h1>
					<h2 className="max-w-md font-normal text-lg text-gray-bright">
						Featuring over 1,000 iOS & Web apps, and 200 sites — New content
						weekly.
					</h2>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-center gap-3">
				<JoinForFreeButton className="h-12 px-5" />
				<PricingButton />
				<DemoButton />
			</div>
		</section>
	);
}
