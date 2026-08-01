# Toolbar view transition implementation plan

Based on commit `1e513b6`.

## Objective

Remove the centered toolbar pill's visible position/width pop when entering Link or Widget views.

## Implementation

1. In `apps/frontend/src/components/page/toolbar.tsx`, change the toolbar pill's `motion.div` from `layout="size"` to the full `layout` prop.
2. Preserve `transition={{ layout: viewTransition }}`. The existing `viewTransition` is already a 200ms `cubic-bezier(0.23, 1, 0.32, 1)` ease-out and a zero-duration reduced-motion branch.
3. Preserve `AnimatePresence initial={false} mode="popLayout"`, `overflow-hidden`, and all child view transitions.

## Scope guard

Do not alter the Link/Widget view markup, copy, input behavior, item creation callbacks, or breakpoint controls. Do not add frontend tests.

## Validation

Run the scoped frontend typecheck and Biome check. Use the in-app browser at `http://localhost:3000/reze` to click Link and Widget, sampling the pill's bounding rectangle during each entry and return transition. Pass when the pill's `x` and `width` values change continuously together and no visible edge jump occurs. Verify reduced-motion remains instantaneous if the browser preference is available.

