import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { env } from "@/env";

export default function NotFound() {
	const { pathname } = useLocation();
	const handle = decodeURIComponent(pathname.split("/")[1] ?? "");

	return (
		<section className="flex flex-1 items-center justify-center px-6 py-16 font-brand">
			<Empty className="">
				<EmptyHeader className="gap-0">
					<EmptyTitle className="font-brand font-bold text-[96px] leading-tight">
						404
					</EmptyTitle>
					<EmptyDescription className="max-w-sm text-gray-bright font-medium tracking-tight">
					  Maybe this is your lucky break.
						<br />
						No one has claimed this handle yet. Grab it now!
					</EmptyDescription>
				</EmptyHeader>
        <EmptyContent className="max-w-2xs my-4 gap-2">
          <div className="w-full rounded-lg bg-secondary/80 flex items-center justify-center h-12 px-18 text-base">
            <span className="text-muted-foreground/80">{env.VITE_APP_DOMAIN}/</span>
            <span>{handle}</span>
          </div>
          <div className="flex flex-col w-full">
            <Button
              render={<Link to="/log-in" />}
              size={'lg'}
              nativeButton={false}
						  variant={"secondary"}
              className={"max-w-md rounded-lg h-12 text-base"}
            >
  					  Grab it!
  					</Button>
  					<Button
              render={<Link to="/" />}
              size={'sm'}
  						nativeButton={false}
  						variant={"link"}
  						className={"rounded-lg text-gray-bright"}
  					>
  			      or back to home
  					</Button>
          </div>
				</EmptyContent>
			</Empty>
		</section>
	);
}
