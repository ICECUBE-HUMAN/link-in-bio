import { env } from "@/env";
import { SmileCircle } from "reicon-react";

export default function MessageSection() {
  return (
    <section className="min-h-[70vh] flex flex-col items-center gap-16 py-20">
      <div>
        <h2 className="text-3xl sm:text-4xl/18 tracking-tighter font-semibold md:text-balance max-w-2xl">From the Builder</h2>
      </div>
      <div className="">
        <div className="text-center rounded-2xl bg-secondary/80 max-w-4xl p-16 tracking-tight leading-7 font-medium text-lg text-balance text-primary/80 flex flex-col gap-5 sm:text-xl">
          <p>
            Hello! I'm Reze, the builder of {env.VITE_APP_TITLE}.
          </p>
          <div>
            <p>
              I never liked the traditional dashboard-style Link in Bio services.
            </p>
            <p>I wanted to create something that feels like your own page, not just another profile.</p>
          </div>
          
          <p>
            I truly love this product, and as long as I can afford to keep it running, {env.VITE_APP_TITLE} will stay completely free.
          </p>
          <p className="flex items-center justify-center">
            Enjoy it. <SmileCircle weight="Filled" />
          </p>
        </div>
      </div>
    </section>
  );
}