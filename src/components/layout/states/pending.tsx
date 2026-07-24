import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Spinner } from "@/components/ui/spinner";

export default function Pending() {
	return (
		<section className="flex flex-1 items-center justify-center px-6 py-16">
			<Marker
				role="status"
				className="w-auto items-center font-brand text-sm text-primary"
			>
				<MarkerIcon className="size-5">
					<Spinner className="size-full" />
				</MarkerIcon>
				<MarkerContent className="shimmer">Just a moment...</MarkerContent>
			</Marker>
		</section>
	);
}
