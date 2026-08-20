import type { ReactNode } from "react";
import { widePageLayout } from "@/lib/handle/page-layout";

type PublicHandleShellProps = {
  profile: ReactNode;
  grid: ReactNode;
  controls: ReactNode;
  toolbar?: ReactNode;
  ownerTools?: ReactNode;
};

export function PublicHandleShell({
  profile,
  grid,
  controls,
  toolbar,
  ownerTools,
}: PublicHandleShellProps) {
  return (
    <main className="page-scroll-container relative box-border min-h-dvh w-full overflow-y-auto bg-background no-scrollbar min-[90rem]:flex min-[90rem]:h-dvh min-[90rem]:items-start min-[90rem]:justify-center">
      <div
        className={`t-breakpoint-frame flex w-full flex-col items-center gap-8 overflow-visible ${widePageLayout.shell} min-[90rem]:min-h-dvh min-[90rem]:max-w-none`}
      >
        <div
          className={`flex min-w-0 w-full max-w-md flex-col ${widePageLayout.profile}`}
        >
          <aside
            id="page-profile"
            data-breakpoint-transition="none"
            className={`t-breakpoint-content t-stagger is-shown flex min-h-0 w-full flex-1 flex-col gap-8 p-6 px-12 pt-12 ${widePageLayout.profileAside}`}
          >
            {profile}
          </aside>
        </div>

        <section
          id="page-grid"
          data-breakpoint-transition="none"
          className={`t-breakpoint-content grid-content-scroll-shell min-h-[calc(100dvh-3rem)] w-full overflow-visible p-0 pt-0 sm:max-w-md no-scrollbar min-[90rem]:px-0 min-[90rem]:pb-24 ${widePageLayout.content}`}
        >
          <div className="flex flex-col gap-4">{grid}</div>
        </section>
      </div>

      {controls}
      {toolbar}
      {ownerTools}
    </main>
  );
}
