import { CheckCircle, Loader, XCircle } from "reicon-react";
import type { CreatePageFlowState } from "@/hooks/use-create-page-flow";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { env } from "@/env";

export function CreateHandleStep({ flow }: { flow: CreatePageFlowState }) {
	const {
		handle,
		setHandle,
		handleStatus,
		isCheckingHandle,
		isCreatingPage,
		submitError,
		onHandleSubmit,
	} = flow;
	const HandleAvailabilityIcon = {
		checking: <Loader className="size-full animate-spin" />,
		available: <CheckCircle weight="Filled" className="size-full" />,
		duplicate: <XCircle weight="Filled" className="size-full" />,
	}[handleStatus.availabilityState];

	return (
		<form
			className="t-page flex flex-col gap-8"
			data-page-id="1"
			onSubmit={onHandleSubmit}
		>
			<div className="flex flex-col items-start gap-0.5">
				<h1 className="text-xl font-medium text-balance">
					First, Claim your handle
				</h1>
				<p className="text-sm text-muted-foreground">
					Choose a unique handle for your public page.
				</p>
			</div>
			<div className="flex flex-col gap-2">
				<Field className="gap-2">
					<InputGroup className="h-11 max-w-full rounded-lg bg-secondary text-base">
						<InputGroupInput
							aria-describedby="handle-status handle-error"
							aria-invalid={Boolean(handleStatus.error)}
							id="handle"
							name="handle"
							onChange={(event) => setHandle(event.target.value)}
							placeholder="your-handle"
							type="text"
							value={handle}
							autoComplete="off"
							className="pl-0.5! text-base! placeholder:font-normal placeholder:text-base! placeholder:text-muted-foreground/50"
						/>
						<InputGroupAddon align="inline-start" className="pl-4 text-base!">
							{env.VITE_APP_DOMAIN}/
						</InputGroupAddon>
						<InputGroupAddon
							align="inline-end"
							data-state={handleStatus.availabilityState}
							id="handle-status"
							className="size-9 data-[state=available]:text-green-500 data-[state=duplicate]:text-destructive"
						>
							{handleStatus.availabilityState === "idle"
								? null
								: HandleAvailabilityIcon}
						</InputGroupAddon>
					</InputGroup>
					{submitError ? (
						<FieldError className="text-center text-xs">
							{submitError}
						</FieldError>
					) : null}
				</Field>
				<Button
					type="submit"
					variant="default"
					size="lg"
					className="h-12 rounded-lg text-base font-medium"
					disabled={
						!handleStatus.canCreatePage || isCheckingHandle || isCreatingPage
					}
				>
					{isCreatingPage ? <Loader className="animate-spin" /> : "Grab it"}
				</Button>
			</div>
		</form>
	);
}
