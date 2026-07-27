import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";

type ErrorStateProps = {
	error: Error;
	reset: () => void;
};

export default function ErrorState({ error, reset }: ErrorStateProps) {
	return (
		<section className="flex flex-1 items-center justify-center px-6 py-16 font-brand">
			<Empty>
				<EmptyHeader className="gap-3">
					<EmptyTitle className="font-brand font-bold text-2xl leading-tight">
			      Well... this wasn't supposed to happen.
					</EmptyTitle>
					<EmptyDescription className="max-w-sm text-base text-gray-bright">
						{error.message || "Please try again."}
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="max-w-2xs gap-1 mt-8">
					<Button type="button" onClick={reset} size={'lg'} variant="secondary" className={'rounded-lg h-12 w-full'}>
						Try again
					</Button>
					<Button render={<Link to="/" />} nativeButton={false} size={'lg'} variant="ghost" className={'rounded-lg h-12 w-full'}>
						Back to home
					</Button>
				</EmptyContent>
			</Empty>
		</section>
	);
}
