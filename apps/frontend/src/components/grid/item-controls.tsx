import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
	GridItemCommandHandler,
	ItemControlsProps,
} from "@/lib/grid/item-registry";

type ItemDeleteButtonProps = {
	itemId: string;
	onCommand: GridItemCommandHandler;
};

export function ItemDeleteButton({ itemId, onCommand }: ItemDeleteButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label="Delete"
			title="Delete"
			onClick={() => onCommand({ type: "delete-item", itemId })}
			className="cursor-pointer! absolute -top-4 -right-4 z-20 inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-background opacity-0 shadow-md transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:scale-100 focus-visible:opacity-100 group-hover/grid-item:scale-100 group-hover/grid-item:opacity-100 group-focus-within/grid-item:scale-100 group-focus-within/grid-item:opacity-100 motion-reduce:transition-none"
		>
			<TrashIcon className="size-5 stroke-3" />
		</Button>
	);
}

export function ItemControls({
	item,
	capabilities,
	onCommand,
}: ItemControlsProps) {
	const menuControls = capabilities.controls.filter(
		(control) => control.command !== "delete-item",
	);

	if (menuControls.length === 0) {
		return null;
	}

	return (
		<div className="flex w-max flex-nowrap items-center gap-1 rounded-full border border-border/70 bg-background/95 p-1 shadow-lg backdrop-blur-sm">
			{menuControls.map((control) => (
				<Button
					key={`${item.id}:${control.command}:${control.preset ?? control.label}`}
					type="button"
					size="xs"
					className="rounded-full"
					variant="secondary"
					aria-label={control.label}
					title={control.label}
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
