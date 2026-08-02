# Login Copy and Mobile Layout Implementation Plan

**Goal:** Align the login screen copy with its route and make the form resilient to mobile dynamic viewport changes.

**Architecture:** Keep the route and authentication flow unchanged. Update the presentational copy and the login page shell in `LogInSection`; use existing Tailwind utilities and existing motion CSS without introducing new tokens or dependencies.

**Tech Stack:** React, TypeScript, TanStack Router, Tailwind CSS, Bun.

## Global Constraints

- Preserve existing magic-link, Google, X, and redirect behavior.
- Preserve unrelated worktree changes.
- Do not add frontend tests unless explicitly requested.
- Use `min-h-dvh` and normal-flow scrolling for the mobile viewport adjustment.

### Task 1: Update login copy and mobile page shell

**Files:**
- Modify: `apps/frontend/src/components/auth/log-in-section.tsx:132-152`

**Implementation:**

- Change the initial heading from `Join` to `Log in to` while retaining the branded app title.
- Retain the existing supporting copy: `Create your beautiful page in seconds.`
- Change the root shell from `min-h-lvh` to `min-h-dvh`.
- Add `overflow-y-auto` and vertical padding to keep the form reachable when the visible viewport is shorter than the content.
- Render idle/loading button contents through one reusable `ButtonContentTransition` that crossfades opacity, `translateY`, and blur over 150ms using `var(--check-ease-out)`.
- Keep the success-state error paragraph mounted with `min-h-4` and animate its hidden/visible state over the same properties and duration.
- In `@media (prefers-reduced-motion: reduce)`, remove transform, blur, and transition from the new classes while preserving the visible state.

**Verification:**

- Run `bun run --filter @sinabro/frontend check`.
- Inspect the diff and confirm only the requested copy/layout lines plus the two documentation files changed.
- In a browser at a narrow viewport, confirm the initial form remains reachable and scrollable.
- Trigger a pending provider state and a resend error to confirm the crossfades and reserved error line.
