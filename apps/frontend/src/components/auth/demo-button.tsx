import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";

export default function TryDemoButton() {
  return (
    <Button
      size="lg"
      variant={'secondary'}
			className="rounded-lg text-base px-5 py-5.5"
			nativeButton={false}
			render={
				<Link to="/demo">
					Try demo
				</Link>
			}
		/>
  );
}
