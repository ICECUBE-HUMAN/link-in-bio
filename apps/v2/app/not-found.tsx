import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-3 text-muted-foreground">
          This page could not be found.
        </p>
        <Link className={buttonVariants({ variant: "link" })} href="/">
          Back to home
        </Link>
      </div>
    </section>
  );
}
