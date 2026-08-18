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
			className="rounded-xl w-full py-5.5 h-12 text-base md:text-lg md:h-14"
			nativeButton={false}
			render={<Link to="/log-in">{title}</Link>}
		/>
	);
}
