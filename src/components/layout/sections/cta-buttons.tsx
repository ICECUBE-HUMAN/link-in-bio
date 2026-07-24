import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";

type CTAButtonProps = {
	className?: string;
};

export function PricingButton({ className }: CTAButtonProps) {
	return (
		<Button
			render={<Link to="/pricing" />}
			nativeButton={false}
			variant="secondary"
			size="lg"
			className={cn("h-12 rounded-xl px-5 text-base", className)}
		>
			See plans
		</Button>
	);
}

export function DemoButton({ className }: CTAButtonProps) {
	return (
		<Button
			render={<Link to="/demo" mask={{ to: "/" }} />}
			nativeButton={false}
			variant="ghost"
			size="lg"
			className={cn("h-12 rounded-xl px-5 text-base", className)}
		>
			See demo <ArrowRightIcon />
		</Button>
	);
}
