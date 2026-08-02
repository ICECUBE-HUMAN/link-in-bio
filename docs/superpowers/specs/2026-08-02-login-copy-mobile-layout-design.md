# Login Copy and Mobile Layout Design

## Goal

Make the login screen's heading accurately describe the login action and keep the form reachable on mobile viewports when the visual viewport shrinks, including while an on-screen keyboard is open.

## Scope

- Update the login heading and supporting copy in `apps/frontend/src/components/auth/log-in-section.tsx`.
- Replace the login page's large-viewport minimum height with dynamic viewport sizing and add in-flow vertical breathing room/scrolling.
- Animate loading-content swaps and success-state errors without changing the surrounding layout.
- Preserve authentication behavior, redirect handling, social providers, magic-link states, and existing motion styles.

## Design

The first state will use `Log in to {VITE_APP_TITLE}` as its heading while retaining the existing supporting copy. The page shell will use `min-h-dvh`, `overflow-y-auto`, and vertical padding so the form remains in normal flow and can be scrolled when the keyboard reduces the visible viewport. Loading labels and spinners will crossfade in a shared grid with 150ms `var(--check-ease-out)` transitions for opacity, transform, and blur. The success-state error will reserve its line and use the same 150ms transition. Reduced motion removes transform, blur, and transitions. No color tokens or provider behavior will change.

## Verification

- Confirm the route still renders the same `LogInSection` and passes the existing redirect target.
- Confirm the heading and supporting copy are visible in the initial state.
- At a narrow mobile viewport, confirm the form remains reachable and the page can scroll when the viewport height is constrained.
- Confirm loading labels crossfade without changing button dimensions and the success error fades into its reserved line.
- Run the frontend formatter/linter check and inspect the diff for unrelated changes.
