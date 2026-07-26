import type { HandleAvailabilityResponse } from "@sinabro/api";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Loader, XCircle } from "reicon-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { env } from "@/env";
import {
	checkPageHandleAvailability,
	createPage,
} from "@/lib/api/pages.functions";
import {
	getSessionQueryOptions,
	invalidateSessionQuery,
} from "@/lib/api/session.functions";
import { getHandleAvailabilityStatus } from "@/lib/page/new-page-state";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

const NEW_PAGE_DESCRIPTION = "Create your Sinabro page.";

export const Route = createFileRoute("/new")({
	beforeLoad: async ({ context }) => {
		const { data: session } = await context.queryClient.ensureQueryData(
			getSessionQueryOptions(),
		);

		if (!session?.user) {
			throw redirect({
				to: "/log-in",
				search: {
					redirect: "/new",
				},
			});
		}

		if (session.user.primaryPageId) {
			throw redirect({
				to: "/",
			});
		}

		return {};
	},
	head: () =>
		createSeo({
			title: "New page",
			description: NEW_PAGE_DESCRIPTION,
			canonicalPath: "/new",
			jsonLd: createWebPageJsonLd({
				title: "New page",
				description: NEW_PAGE_DESCRIPTION,
				path: "/new",
			}),
		}),
	component: NewPage,
});

const handleAvailabilityIcons = {
	checking: <Loader className="animate-spin size-full" />,
	available: <CheckCircle weight="Filled" className="size-full" />,
	duplicate: <XCircle weight="Filled" className="size-full"/>,
};

function NewPage() {
	const { queryClient } = Route.useRouteContext();
	const navigate = useNavigate({ from: Route.fullPath });
	const [handle, setHandle] = useState("");
	const [availability, setAvailability] =
		useState<HandleAvailabilityResponse | null>(null);
	const [isCheckingHandle, setIsCheckingHandle] = useState(false);
	const [isCreatingPage, setIsCreatingPage] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const handleStatus = useMemo(
		() => getHandleAvailabilityStatus(handle, availability, isCheckingHandle),
		[handle, availability, isCheckingHandle],
	);
	const HandleAvailabilityIcon =
		handleStatus.availabilityState === "idle"
			? null
			: handleAvailabilityIcons[handleStatus.availabilityState];

	useEffect(() => {
		setSubmitError(null);

		if (!handle.trim()) {
			setAvailability(null);
			setIsCheckingHandle(false);
			return;
		}

		let isCurrent = true;
		const timeoutId = window.setTimeout(async () => {
			setIsCheckingHandle(true);

			try {
				const result = await checkPageHandleAvailability({
					data: { handle },
				});

				if (isCurrent) {
					setAvailability(result);
				}
			} catch {
				if (isCurrent) {
					setAvailability(null);
					setSubmitError("Could not check this handle. Try again.");
				}
			} finally {
				if (isCurrent) {
					setIsCheckingHandle(false);
				}
			}
		}, 400);

		return () => {
			isCurrent = false;
			window.clearTimeout(timeoutId);
		};
	}, [handle]);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!handleStatus.canCreatePage || isCreatingPage) {
			return;
		}

		setIsCreatingPage(true);
		setSubmitError(null);

		try {
			const response = await createPage({
				data: {
					handle: handleStatus.normalizedHandle,
					name: null,
				},
			});

			invalidateSessionQuery(queryClient);

			await navigate({
				to: "/$handle",
				params: {
					handle: response.page.handle,
				},
			});
		} catch {
			setSubmitError("Could not create your page. Try again.");
		} finally {
			setIsCreatingPage(false);
		}
	};

	return (
    <main className="mx-auto flex min-h-lvh w-full max-w-md flex-col justify-center px-5">
      <div className="flex-1 basis-0"/>
			<form className="flex flex-col gap-16" onSubmit={onSubmit}>
        <div className="space-y-2 leading-tight">
					<h1 className="text-3xl font-semibold text-balance md:text-4xl">
						Claim your handle
					</h1>
					<h2 className="text-base font-medium text-muted-foreground/80 md:text-lg">
						It will be used in your public page
					</h2>
				</div>

				<div className="flex flex-col gap-4">
					<Field className="gap-2">
						<InputGroup className="h-12">
							<InputGroupInput
								aria-describedby="handle-status handle-error"
								aria-invalid={Boolean(handleStatus.error)}
								id="handle"
								name="handle"
								onChange={(event) => {
									setHandle(event.target.value);
								}}
								placeholder="your-handle"
								type="text"
								value={handle}
								autoComplete="off"
								className="placeholder:text-base! placeholder:text-muted-foreground/50 placeholder:font-normal pl-1! text-base!"
							/>
							<InputGroupAddon align={"inline-start"} className="text-base! pl-4">
								{env.VITE_APP_DOMAIN}/
              </InputGroupAddon>
              <InputGroupAddon
                align="inline-end"
                data-state={handleStatus.availabilityState}
                id="handle-status"
                className="size-10 data-[state=available]:text-green-500 data-[state=duplicate]:text-destructive"
              >
                {HandleAvailabilityIcon}
              </InputGroupAddon>
            </InputGroup>
            {submitError ? <FieldError className="text-center text-xs">{submitError}</FieldError> : null}
					</Field>

					<Button
						disabled={
							!handleStatus.canCreatePage || isCheckingHandle || isCreatingPage
						}
						variant={"secondary"}
						size="lg"
						type="submit"
						className={"rounded-xl h-12 text-base font-medium"}
					>
            {isCreatingPage ?
              <span className="flex items-center gap-2">
                <Loader className="animate-spin" />
                Creating...
              </span>
              : "Create page"
            }
          </Button>
				</div>
			</form>
      <div className="flex-1 basis-0 flex items-end text-xs text-muted-foreground/80 justify-center p-5">
        <span>Only lowercase letters, numbers, and hyphens are allowed.</span>
			</div>
		</main>
	);
}
