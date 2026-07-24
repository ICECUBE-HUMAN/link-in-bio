import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import CTASection from "@/components/layout/sections/cta-section";
import DemoSection from "@/components/layout/sections/demo-section";
import FAQSection from "@/components/layout/sections/faq-section";
import FeatureSection, {
	FeatureSection2,
	FeatureSection3,
} from "@/components/layout/sections/feature-section";
import HeroSection from "@/components/layout/sections/hero-section";
import PricingSection from "@/components/layout/sections/pricing-section";
import TestimonialSection, {
	TestimonialSection2,
} from "@/components/layout/sections/testimonial-section";
import Announcement from "@/components/layout/shell/announcement";
import { Footer, type FooterVariant } from "@/components/layout/shell/footer";
import Header from "@/components/layout/shell/header";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/shared/utils";

type HomePageProps = {
	demoOpen?: boolean;
};

export function HomePage({ demoOpen = false }: HomePageProps) {
	const footerVariant: FooterVariant = "centered";
	const isRevealFooter = footerVariant === "reveal";
	const navigate = useNavigate();
	const closeTimeoutRef = useRef<number | null>(null);
	const [isDemoVisible, setIsDemoVisible] = useState(false);

	useEffect(() => {
		if (closeTimeoutRef.current !== null) {
			window.clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}

		if (demoOpen) {
			const frame = window.requestAnimationFrame(() => {
				setIsDemoVisible(true);
			});

			return () => window.cancelAnimationFrame(frame);
		}

		setIsDemoVisible(false);
	}, [demoOpen]);

	useEffect(() => {
		return () => {
			if (closeTimeoutRef.current !== null) {
				window.clearTimeout(closeTimeoutRef.current);
			}
		};
	}, []);

	return (
		<>
			<div
				className={cn(
					isRevealFooter &&
						"relative bg-foreground pb-[42vh] sm:pb-[48vh]",
				)}
			>
				<div
					className={cn(
						"flex min-h-lvh flex-col",
						isRevealFooter &&
							"relative z-10 rounded-b-[2rem] bg-background shadow-[0_20px_80px_rgba(0,0,0,0.12)]",
					)}
				>
					<Announcement />
					<Header />
					<main className="flex-1 px-5 pb-16">
						<HeroSection />
						<DemoSection />
						<TestimonialSection />
						<TestimonialSection2 />
						<FeatureSection />
						<FeatureSection2 />
						<FeatureSection3 />
						<PricingSection />
						<FAQSection />
						<CTASection />
					</main>
				</div>
				<Footer variant={footerVariant} />
			</div>
			<Drawer
				open={isDemoVisible}
				showSwipeHandle
				onOpenChange={(open) => {
					setIsDemoVisible(open);

					if (!open && demoOpen) {
						closeTimeoutRef.current = window.setTimeout(() => {
							void navigate({ to: "/" });
						}, 450);
					}
				}}
			>
				<DrawerContent className="h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)]">
					<div className="relative flex h-full flex-col bg-background">
						<div className="hidden items-center justify-between border-b px-5 py-4">
							<div>
								<DrawerTitle className="text-base font-bold">Demo</DrawerTitle>
								<DrawerDescription>
									Preview the product in a full-height drawer.
								</DrawerDescription>
							</div>
						</div>
						<div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-5">
							Demo Content
            </div>

            <div className="fixed bottom-5 flex justify-center w-full">
              <DrawerClose
							render={<Button variant="default" size="icon-lg" className={'border-foreground shadow-sm'} />}
							aria-label="Close demo"
						>
							<XIcon className="stroke-3 size-5"/>
						</DrawerClose>  
            </div>
            
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
