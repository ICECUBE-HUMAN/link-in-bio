import { SpinnerGap } from "@phosphor-icons/react";
import { cn } from "@/lib/shared/utils.ts";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
	return (
		<SpinnerGap
			data-slot="spinner"
			role="status"
			aria-label="Loading"
			className={cn("size-4 animate-spin", className)}
			{...props}
		/>
	);
}

export { Spinner };
