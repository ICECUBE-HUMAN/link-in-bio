# REZ-221 Next.js Common Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Grabbin's shared document defaults, providers, status screens, and production-only Simple Analytics tracking to `apps/v2`, while adding only required CSS imports and leaving the existing V2 CSS body unchanged.

**Architecture:** Keep the V2 root layout as the only document shell. A client `Providers` component owns tooltip and toast providers, while a separate client `SimpleAnalyticsTracker` owns host-gated pageview calls. Next.js `not-found.tsx` and `error.tsx` provide generic shared states; handle-specific copy remains in the later public-handle issue.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, `@base-ui/react`, Sonner, Inter Variable, Bun, Biome, TypeScript, OpenNext Cloudflare.

**Spec:** `docs/superpowers/specs/2026-08-19-rez-221-nextjs-common-foundation-design.md`

## Global Constraints

- Do not modify or delete existing `apps/frontend` common code.
- Do not add public routes, login, sessions, editing, API, database, or handle-specific behavior.
- Record Simple Analytics pageviews only when `window.location.hostname === "grabbin.me"`.
- Keep automatic Simple Analytics collection disabled (`data-auto-collect="false"`).
- Do not add frontend automated tests; use `bun run check:v2`, `bun run build:v2`, and manual browser/curl checks.
- Preserve unrelated dirty files, including the existing `apps/v2/app/globals.css` change.

---

### Task 1: Add only the required V2 global CSS imports

**Files:**
- Modify: `apps/v2/app/globals.css`
- Modify: `apps/v2/package.json` to declare the existing `@fontsource-variable/inter` package
- Modify: `bun.lock` only if the workspace manifest update changes the lockfile

**Interfaces:**
- Consumes: The import list at the top of `apps/frontend/src/styles.css`.
- Produces: Only the required import lines in V2; the existing V2 CSS body and tokens remain unchanged.

- [ ] **Step 1: Preserve the existing V2-only dirty CSS change**

  Read the current diff before editing and retain the `no-scrollbar` utility already present in `apps/v2/app/globals.css`.

  ```sh
  git diff -- apps/v2/app/globals.css
  ```

- [ ] **Step 2: Add only import lines already used by the old stylesheet**

  Keep every existing V2 CSS rule and token. Declare `@fontsource-variable/inter` in `apps/v2/package.json` at the version already used by `apps/frontend`, then add only these import statements to `apps/v2/app/globals.css`:

  ```css
  @import "@fontsource-variable/inter";
  @import "react-grid-layout/css/styles.css";
  @import "../../frontend/src/styles/grid-motion.css";
  @import "../../frontend/src/styles/grid-layout.css";
  @import "../../frontend/src/styles/motion.css";
  @import "../../frontend/src/styles/interaction-motion.css";
  @import "../../frontend/src/styles/theme-tokens.css";
  @import "../../frontend/src/styles/utilities.css";
  @import "../../frontend/src/styles/legal.css";
  @import "../../frontend/src/styles/surfaces.css";
  ```

  Do not copy the body of `apps/frontend/src/styles.css`, do not copy its tokens or utility rules, and do not create V2 copies of the three imported stylesheet files in this task. These relative imports intentionally read the existing workspace files until their own migration issues are completed.

- [ ] **Step 3: Run formatting and inspect only the intended files**

  ```sh
  bunx biome format --write apps/v2/app/globals.css
  git diff --check -- apps/v2/app/globals.css
  ```

  Expected: no whitespace errors; no `apps/frontend` file appears in the diff.

### Task 2: Build the V2 document shell and metadata

**Files:**
- Modify: `apps/v2/app/layout.tsx`
- Modify: `apps/v2/app/globals.css` only for import lines

**Interfaces:**
- Consumes: `apps/frontend/src/routes/__root.tsx` document structure and `apps/frontend/src/lib/seo/metadata.ts` default values.
- Produces: A Next.js root layout with stable HTML structure, default metadata, icon links, manifest link, and the shared `Providers` component.

- [ ] **Step 1: Define the default Next metadata**

  Use Next's `Metadata` object with the existing default values:

  ```ts
  export const metadata: Metadata = {
    title: "Grabbin",
    description:
      "Create a beautiful link in bio page with your links, media, and favorite places.",
    icons: {
      icon: "/favicon.svg",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
  };
  ```

  Keep page-specific canonical, Open Graph, JSON-LD, and article metadata out of this task.

- [ ] **Step 2: Implement the stable root element structure**

  Keep the current `Inter` font import and use the existing app shell shape:

  ```tsx
  export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
      <html lang="en" className="h-full">
        <body className="flex flex-col">
          <Providers>
            <main className="flex min-h-svh flex-col">{children}</main>
          </Providers>
        </body>
      </html>
    );
  }
  ```

  Do not add route-specific navigation or data fetching.

- [ ] **Step 3: Add the production-only analytics script shell**

  Render the Simple Analytics script with automatic collection disabled, and render `SimpleAnalyticsTracker` inside `Providers`. The tracker will make the host decision in Task 4; the root layout must not inspect request headers or become unnecessarily dynamic.

### Task 3: Add shared tooltip and toast providers

**Files:**
- Create: `apps/v2/components/providers.tsx`
- Create: `apps/v2/components/ui/tooltip.tsx`
- Create: `apps/v2/components/ui/sonner.tsx`
- Modify: `apps/v2/package.json` to add `sonner` if it is not already declared

**Interfaces:**
- Consumes: Existing V2 `cn` helper, `@base-ui/react/tooltip`, and the existing frontend tooltip/toast visual contracts.
- Produces: `Providers({ children }: { children: React.ReactNode }): JSX.Element` and reusable `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `Toaster` components.

- [ ] **Step 1: Add the existing Sonner dependency declaration**

  Add the workspace's existing Sonner package at the version already used by the lockfile; do not add `next-themes`, because this issue does not introduce theme switching.

- [ ] **Step 2: Implement the tooltip wrapper**

  Port the existing `@base-ui/react/tooltip` wrapper and preserve its public names and default geometry:

  ```tsx
  export function TooltipProvider(props: TooltipPrimitive.Provider.Props) {
    return <TooltipPrimitive.Provider delay={0} {...props} />;
  }
  ```

  Keep `TooltipContent`'s `side="top"`, `sideOffset={4}`, `align="center"`, portal, and `cn`-merged classes unchanged from the existing app.

- [ ] **Step 3: Implement the toast wrapper without a theme provider**

  Reuse the existing icon mapping and CSS variable names, but pass a stable light theme:

  ```tsx
  export function Toaster(props: ToasterProps) {
    return <Sonner theme="light" {...props} />;
  }
  ```

  Keep the existing bottom-center default at the provider call site and preserve toast class names.

- [ ] **Step 4: Compose the providers in one client component**

  ```tsx
  "use client";

  export function Providers({ children }: { children: React.ReactNode }) {
    return (
      <TooltipProvider>
        {children}
        <Toaster position="bottom-center" />
      </TooltipProvider>
    );
  }
  ```

  Keep the provider file as the only document-wide client boundary.

### Task 4: Add host-gated Simple Analytics pageview tracking

**Files:**
- Create: `apps/v2/components/simple-analytics-tracker.tsx`
- Modify: `apps/v2/app/layout.tsx`

**Interfaces:**
- Consumes: `usePathname()` and `window.sa_pageview` from the existing Simple Analytics contract.
- Produces: A client component that returns no visible markup and calls `sa_pageview(pathname)` only on `grabbin.me`.

- [ ] **Step 1: Define the browser API type and production-host guard**

  ```tsx
  "use client";

  declare global {
    interface Window {
      sa_pageview?: (path?: string) => void;
    }
  }

  const isProductionHost = () =>
    typeof window !== "undefined" && window.location.hostname === "grabbin.me";
  ```

- [ ] **Step 2: Track the pathname without blocking rendering**

  Use `usePathname()` and an effect keyed by pathname. If the host is not production, return immediately. If `sa_pageview` is not ready, register one `load` listener and remove it in cleanup:

  ```tsx
  export function SimpleAnalyticsTracker() {
    const pathname = usePathname();

    useEffect(() => {
      if (!isProductionHost()) return;

      if (window.sa_pageview) {
        window.sa_pageview(pathname);
        return;
      }

      const retryOnLoad = () => window.sa_pageview?.(pathname);
      window.addEventListener("load", retryOnLoad, { once: true });
      return () => window.removeEventListener("load", retryOnLoad);
    }, [pathname]);

    return null;
  }
  ```

- [ ] **Step 3: Render the tracker and script from the root layout**

  Keep `data-auto-collect="false"` on the external script and include the tracker inside the document body. The V2 preview host may load the script but must never call `sa_pageview`.

### Task 5: Add generic Next.js error and not-found states

**Files:**
- Create: `apps/v2/app/not-found.tsx`
- Create: `apps/v2/app/error.tsx`

**Interfaces:**
- Consumes: V2 `Button`/`buttonVariants` and the shared style tokens from Tasks 1–3.
- Produces: Generic route-independent 404 and recoverable error states.

- [ ] **Step 1: Implement `not-found.tsx` as a server component**

  Render a centered `404`, a short generic message, and an anchor to `/`. Do not use TanStack Router imports or handle-specific environment values.

  ```tsx
  import Link from "next/link";
  import { buttonVariants } from "@/components/ui/button";

  export default function NotFound() {
    return (
      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="text-center">
          <h1 className="text-7xl font-bold">404</h1>
          <p className="mt-3 text-muted-foreground">This page could not be found.</p>
          <Link className={buttonVariants({ variant: "link" })} href="/">
            Back to home
          </Link>
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 2: Implement `error.tsx` as the required client boundary**

  Show the error message only in development, expose `reset()`, and link home:

  ```tsx
  "use client";

  export default function Error({
    error,
    reset,
  }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
      <section role="alert" className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Well... this wasn't supposed to happen.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {process.env.NODE_ENV === "development" ? error.message : "Please try again."}
          </p>
          <button className={buttonVariants({ variant: "secondary", size: "lg" })} onClick={reset}>
            Try again
          </button>
          <Link className={buttonVariants({ variant: "link", size: "sm" })} href="/">
            Back to home
          </Link>
        </div>
      </section>
    );
  }
  ```

  Import `Link` and `buttonVariants` explicitly; do not introduce a new error component abstraction.

### Task 6: Verify the common foundation and record the result

**Files:**
- Modify: `apps/v2/README.md` only if a new V2 verification command or environment note is needed
- No frontend test files

**Interfaces:**
- Consumes: All V2 files produced by Tasks 1–5.
- Produces: Verified local and deployed common foundation; Linear issue evidence.

- [ ] **Step 1: Run V2 static checks**

  ```sh
  bun run check:v2
  ```

  Expected: Biome and TypeScript pass. Fix only errors caused by this issue.

- [ ] **Step 2: Build V2 for OpenNext**

  ```sh
  bun run build:v2
  ```

  Expected: Next.js production build succeeds without changing the existing frontend build.

- [ ] **Step 3: Run the local V2 preview**

  ```sh
  bun run preview:v2
  curl -i http://localhost:8787/
  curl -i http://localhost:8787/missing-common-foundation-route
  ```

  Expected: `/` returns 200; the missing route returns the generic 404 page; no analytics pageview is sent from localhost.

- [ ] **Step 4: Deploy only V2 and verify the preview host**

  ```sh
  bun run deploy:v2
  curl -sSIL https://v2.grabbin.me/
  curl -sSIL https://v2.grabbin.me/missing-common-foundation-route
  ```

  Expected: both responses are served by V2; browser console has no provider or hydration errors; `v2.grabbin.me` does not call `sa_pageview`.

- [ ] **Step 5: Verify the production-host gate without changing the live domain**

  Use a browser request override or local host mapping only if already available; do not deploy `grabbin.me` in this issue. Confirm the tracker condition is exact and that `v2.grabbin.me` remains excluded.

- [ ] **Step 6: Record evidence and update Linear**

  Add the command results, build/deploy timestamp, `/` and missing-route HTTP statuses, and analytics host-gate result to REZ-221. Mark REZ-221 Done only after all checklist items pass.
