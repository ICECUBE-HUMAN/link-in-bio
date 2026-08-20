import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTAButton({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <Button
      size="lg"
      variant="brand"
      className="rounded-xl w-full py-5.5 h-13 text-lg md:text-lg md:h-14"
      nativeButton={false}
      render={<Link href={href as never}>{title}</Link>}
    />
  );
}
