import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSession } from "@/lib/api/session.functions";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createSeo } from "@/lib/seo/metadata";

const NEW_PAGE_DESCRIPTION = "Create your Sinabro page.";

export const Route = createFileRoute("/new")({
	beforeLoad: async () => {
		const { data: session } = await getSession();

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
	return (
		<main className="mx-auto flex min-h-lvh w-full max-w-xl flex-col justify-center px-5 py-20">
			<form className="flex flex-col gap-8">
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
								id="handle"
								name="handle"
								placeholder="your-handle"
								type="text"
							/>
							<FieldDescription>
								This will be used in your public page URL.
							</FieldDescription>
						</Field>

						<Field>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								id="name"
								name="name"
								placeholder="Your name"
								type="text"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="bio">Bio</FieldLabel>
							<FieldContent>
								<Textarea id="bio" name="bio" placeholder="A short bio" />
							</FieldContent>
						</Field>
					</FieldGroup>
				</FieldSet>

				<Button type="button" size="lg">
					Create page
				</Button>
			</form>
		</main>
	);
}
