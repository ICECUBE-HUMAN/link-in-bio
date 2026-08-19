import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="flex min-h-svh flex-col items-center justify-center gap-16 max-w-4xl mx-auto">
      <div className="flex flex-col justify-between items-center gap-12 w-full">
        <div className="flex flex-col items-center justify-center gap-12">
          <header className="flex flex-col gap-8 items-center">
            <div className="size-20">
              <Image
                src="/favicon.svg"
                alt="Grabbin"
                width={80}
                height={80}
                className="size-full object-cover"
              />
            </div>
            <h1 className="flex flex-col items-center text-4xl font-semibold md:text-5xl">
              <span>Bring everything.</span>
              <span>Be yourself.</span>
            </h1>
            <p className="text-lg font-medium text-center text-balance md:text-xl">
              A cleaner, more beautiful link in bio.
              <span className="block text-gray-bright">
                Your links, content, and favorite places — all in one link in
                bio.
              </span>
            </p>
          </header>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 w-3xs md:w-xs">
          <Button
            size="lg"
            variant="brand"
            className="rounded-xl w-full py-5.5 h-13 text-lg md:text-lg md:h-14"
            nativeButton={false}
            render={<Link href="/log-in">Join for free</Link>}
          />
          <Button
            size="lg"
            variant="secondary"
            className="rounded-xl w-full py-5.5 h-13 text-lg md:text-lg md:h-14 text-muted-foreground"
            nativeButton={false}
            render={<Link href={"/demo" as never}>Try demo</Link>}
          />
        </div>
      </div>
    </section>
  );
}
