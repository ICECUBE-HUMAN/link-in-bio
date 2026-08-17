import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDemoPage } from "@/lib/demo/demo-page.functions";
import {
	createHandlePageHead,
	type HandleLoaderData,
	HandlePageContent,
} from "./$handle";

export const Route = createFileRoute("/demo")({
	loader: (): HandleLoaderData => {
		const demoPage = getDemoPage();
		return {
			page: demoPage.page,
			items: demoPage.items,
			isCurrentUserPage: true,
			isDemo: true,
			visitorsEnabled: false,
		};
	},
	head: ({ loaderData }) => createHandlePageHead(loaderData),
	component: DemoPage,
});

function DemoPage() {
	const loaderData = Route.useLoaderData();
	const [page, setPage] = useState(loaderData.page);

	useEffect(() => {
		setPage(loaderData.page);
	}, [loaderData.page]);

	const displayedPage =
		page.handle === loaderData.page.handle ? page : loaderData.page;

	return (
		<HandlePageContent
			key={displayedPage.handle}
			loaderData={{ ...loaderData, page: displayedPage }}
			onPageChange={setPage}
		/>
	);
}
