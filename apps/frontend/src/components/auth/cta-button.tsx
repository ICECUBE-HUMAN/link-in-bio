import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getMyPage, MY_PAGE_QUERY_KEY } from "@/lib/api/pages.functions";
import { getSessionQueryOptions } from "@/lib/api/session.functions";
import { Button } from "../ui/button";

export default function CTAButton({
	title = "Make your own",
}: {
	title?: string;
}) {
	const { data: sessionResult } = useQuery(getSessionQueryOptions());
	const primaryPageId = sessionResult?.data?.user.primaryPageId;
	const isSignedIn = Boolean(sessionResult?.data?.user);
	const { data: myPageResult } = useQuery({
		queryKey: MY_PAGE_QUERY_KEY,
		queryFn: getMyPage,
		enabled: Boolean(primaryPageId),
	});
	const handle = myPageResult?.page?.handle;

	const link = handle ? (
		<Link to="/$handle" params={{ handle }}>
			{title}
		</Link>
	) : isSignedIn ? (
		<Link to="/new">{title}</Link>
	) : (
		<Link to="/log-in" search={{ redirect: "/new" }}>
			{title}
		</Link>
	);

	return (
		<Button
			size="lg"
			className="h-12 rounded-md px-10 text-base"
			nativeButton={false}
			render={link}
		/>
	);
}
