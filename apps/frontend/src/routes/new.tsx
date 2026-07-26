import type { HandleAvailabilityResponse } from "@sinabro/api";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

		return {
			userName: session.user.name,
		};
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

function NewPage() {
	const { queryClient, userName } = Route.useRouteContext();
	const navigate = useNavigate({ from: Route.fullPath });
	const [handle, setHandle] = useState("");
	const [availability, setAvailability] =
		useState<HandleAvailabilityResponse | null>(null);
	const [isCheckingHandle, setIsCheckingHandle] = useState(false);
	const [isCreatingPage, setIsCreatingPage] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const handleStatus = useMemo(
		() => getHandleAvailabilityStatus(handle, availability),
		[handle, availability],
	);

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
					name: userName,
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
		<main className="mx-auto flex min-h-lvh w-full max-w-xl flex-col justify-center px-5 py-20">
			<form className="flex flex-col gap-8" onSubmit={onSubmit}>
				<div className="space-y-3">
					<p className="font-medium text-muted-foreground text-sm">New page</p>
					<h1 className="text-3xl font-bold text-balance md:text-4xl">
						Create your page
					</h1>
				</div>

				<FieldSet>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="handle">Handle</FieldLabel>
							<Input
								aria-describedby="handle-description handle-error"
								aria-invalid={Boolean(handleStatus.error)}
								id="handle"
								name="handle"
								onChange={(event) => {
									setHandle(event.target.value);
								}}
								placeholder="your-handle"
								type="text"
								value={handle}
							/>
							<FieldDescription id="handle-description">
								This will be used in your public page URL.
							</FieldDescription>
							<FieldContent>
								<FieldError id="handle-error">{handleStatus.error}</FieldError>
							</FieldContent>
						</Field>
					</FieldGroup>
				</FieldSet>

				{submitError ? <FieldError>{submitError}</FieldError> : null}

				<Button
					disabled={
						!handleStatus.canCreatePage || isCheckingHandle || isCreatingPage
					}
					size="lg"
					type="submit"
				>
					{isCreatingPage ? "Creating..." : "Create page"}
				</Button>
			</form>
		</main>
	);
}
