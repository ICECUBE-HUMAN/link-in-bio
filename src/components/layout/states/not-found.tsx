import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
	return (
		<section className="flex flex-1 items-center justify-center px-6 py-16 font-brand">
			<Empty className="">
				<EmptyHeader className="gap-0">
					<EmptyTitle className="font-brand font-bold text-[96px]">
						404
					</EmptyTitle>
					<EmptyDescription className="max-w-sm">
						The page you are looking for does not exist.
						<br />
						It may have existed for a moment, but maybe it's just resting now.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="my-4">
					<Button
						render={<Link to="/" />}
						nativeButton={false}
						variant={"secondary"}
						className={"rounded-xl"}
					>
						Back to home
					</Button>
				</EmptyContent>
			</Empty>
		</section>
	);
}
