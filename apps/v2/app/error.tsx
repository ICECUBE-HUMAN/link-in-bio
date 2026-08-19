"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="flex flex-1 items-center justify-center px-6 py-16"
    >
      <div className="text-center">
        <h1 className="text-2xl font-semibold">
          Well... this wasn&apos;t supposed to happen.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {process.env.NODE_ENV === "development"
            ? error.message
            : "Please try again."}
        </p>
        <div className="mt-8 flex flex-col items-center gap-1">
          <button
            className={buttonVariants({ variant: "secondary", size: "lg" })}
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link
            className={buttonVariants({ variant: "link", size: "sm" })}
            href="/"
          >
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
