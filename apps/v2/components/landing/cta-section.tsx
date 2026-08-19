import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="h-[60vh] flex flex-col items-center justify-center gap-16 max-w-4xl mx-auto p-4">
      <div className="flex flex-col justify-between items-center gap-12 w-full">
        <header className="flex flex-col gap-8 items-center">
          <h2 className="flex flex-col items-center text-4xl font-semibold md:text-5xl">
            <span>Turn one link</span>
            <span>into your world.</span>
          </h2>
          <p className="text-lg font-medium text-center text-balance md:text-xl">
            Share your links, media, and favorite places in one beautiful page.
          </p>
        </header>
        <div className="flex flex-col items-center justify-center gap-2 w-3xs md:w-xs">
          <Button
            size="lg"
            variant="brand"
            className="rounded-xl w-full py-5.5 h-13 text-lg md:text-lg md:h-14"
            nativeButton={false}
            render={<Link href="/log-in">Get started</Link>}
          />
          <Button
            size="lg"
            variant="secondary"
            className="rounded-xl w-full py-5.5 h-13 text-lg md:text-lg md:h-14 text-muted-foreground"
            nativeButton={false}
            render={<Link href={"/demo" as never}>Try demo</Link>}
          />
          <p className="text-sm font-medium text-gray-bright md:text-base">
            Create your page in seconds.
          </p>
        </div>
      </div>
    </section>
  );
}
