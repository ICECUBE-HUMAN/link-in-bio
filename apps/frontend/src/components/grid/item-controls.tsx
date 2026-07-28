import { Button } from "@/components/ui/button";
import type { ItemControlsProps } from "@/lib/grid/item-registry";

export function ItemControls({
	item,
	capabilities,
	onCommand,
}: ItemControlsProps) {
	if (capabilities.controls.length === 0) {
		return null;
	}

	return (
		<div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur-sm">
			{capabilities.controls.map((control) => (
				<Button
					key={`${item.id}:${control.command}:${control.preset ?? control.label}`}
					type="button"
					variant="secondary"
					size="xs"
					className="rounded-full"
					onClick={() => {
						if (control.command === "apply-preset" && control.preset) {
							onCommand?.({
								type: "apply-preset",
								itemId: item.id,
								preset: control.preset,
							});
							return;
						}

						onCommand?.({
							type: "manage-link",
							itemId: item.id,
						});
					}}
				>
					{control.label}
				</Button>
			))}
		</div>
	);
}
