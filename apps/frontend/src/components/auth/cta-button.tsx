import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";

export default function CTAButton({
	title = "Make your own",
}: {
	title?: string;
}) {
	return (
		<Button
			size="lg"
			className="h-12 rounded-xl px-10 text-base"
			nativeButton={false}
			render={<Link to="/log-in">{title}</Link>}
		/>
	);
}
