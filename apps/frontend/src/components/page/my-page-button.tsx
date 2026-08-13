import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyPage, MY_PAGE_QUERY_KEY } from "@/lib/api/pages.functions";
import { getProfileImageUrl } from "@/lib/api/profile-image-api";

export function MyPageButton() {
	const { data, isPending } = useQuery({
		queryKey: MY_PAGE_QUERY_KEY,
		queryFn: getMyPage,
	});
	const page = data?.page;

	if (isPending) {
		return (
			<Button
				variant="ghost"
				size="sm"
				disabled
				aria-busy="true"
				className="text-muted-foreground/80 rounded-md gap-1.5"
			>
				<Skeleton className="size-4 rounded-full" />
				<Skeleton className="h-4 w-14 rounded-md" />
			</Button>
		);
	}

	if (!page) return null;

	return (
		<Button
			render={<Link to="/$handle" params={{ handle: page.handle }} />}
			variant="ghost"
			nativeButton={false}
			size="sm"
			className="text-muted-foreground/80 rounded-md gap-1.5"
		>
			<Avatar size="xs">
				<AvatarImage src={getProfileImageUrl(page.image) ?? undefined} alt="" />
				<AvatarFallback />
			</Avatar>
			<span>My page</span>
		</Button>
	);
}
