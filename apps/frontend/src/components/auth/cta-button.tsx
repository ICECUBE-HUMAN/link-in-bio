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
      variant={'brand'}
			className="rounded-lg text-base px-6 py-5.5"
			nativeButton={false}
			render={<Link to="/log-in">{title}</Link>}
		/>
	);
}
