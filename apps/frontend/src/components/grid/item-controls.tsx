import { Trash2 } from "lucide-react";
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
		<div className="flex w-max flex-nowrap items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur-sm">
			{capabilities.controls.map((control) => (
				<Button
					key={`${item.id}:${control.command}:${control.preset ?? control.label}`}
					type="button"
					size="xs"
					className="rounded-full"
					variant={
						control.command === "delete-item" ? "destructive" : "secondary"
					}
					aria-label={control.label}
					title={control.label}
					onClick={() => {
						if (control.command === "delete-item") {
							onCommand?.({
								type: "delete-item",
								itemId: item.id,
							});
							return;
						}

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
					{control.command === "delete-item" ? (
						<Trash2 aria-hidden="true" />
					) : (
						control.label
					)}
				</Button>
			))}
		</div>
	);
}
