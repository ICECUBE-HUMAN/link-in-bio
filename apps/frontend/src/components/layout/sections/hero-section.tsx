import CTAButton from "@/components/auth/cta-button";
import { StickerSquare } from "reicon-react";

export default function HeroSection() {
	return (
		<section className="flex min-h-[70vh] flex-col gap-16 pt-40">
			<div className="flex flex-col items-center justify-center gap-12">
				<div className="flex flex-col gap-6 text-center">
          <h1 className="text-4xl sm:text-6xl/18 tracking-tighter font-semibold md:text-balance max-w-2xl flex flex-col">
            <span className="flex justify-center items-center gap-2">
              <StickerSquare className="size-10 sm:size-14" weight="Filled" />
              Experience-first
            </span>
            <span>link in bio</span>
					</h1>
					<h2 className="max-w-md text-base text-gray-bright text-balance tracking-tight leading-tight sm:text-lg">
            <p>No more dashboard</p>
            <p>Just drag&drop all items that represent you.</p>
					</h2>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-center gap-3">
				<CTAButton title="Join for free" />
			</div>
		</section>
	);
}
