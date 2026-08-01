# Toolbar view transition design

## Scope

Make the editor toolbar's `toolbar` → `link` and `toolbar` → `widget` view changes resize and recenter as one continuous motion. The existing view crossfade and horizontal handoff remain; this change only fixes the parent layout projection that causes the centered pill's left edge to jump before its width finishes interpolating.

## Current behavior

`apps/frontend/src/components/page/toolbar.tsx` renders the centered pill inside a full-width flex container. The pill uses `layout="size"`, which interpolates its size but excludes its position. When the intrinsic child width changes, the flex container immediately calculates the new centered `x` position while the pill is still animating its width.

Browser evidence at `http://localhost:3000/reze`:

- toolbar baseline: `x=526`, `width=228`
- approximately 16ms after Link: `x=486`, `width=240`
- approximately 32ms after Link: `x=486`, `width=283`
- approximately 100ms after Link: `x≈486`, `width=308`

The left edge therefore moves to the final centered position before the resize settles, which is perceived as a width pop. Widget uses the same parent and has the same defect.

## Design

Use Motion's full `layout` projection on the pill. This includes both position and size, allowing the centered pill to move from its old bounds to its new bounds continuously. Keep `AnimatePresence mode="popLayout"` so the outgoing view is removed from intrinsic layout while the parent projection handles the transition. Keep the existing 200ms strong ease-out curve, overflow clipping, reduced-motion branch, and per-view `transform`/opacity handoff.

## Boundaries

- Modify only the toolbar parent layout mode unless browser verification proves a narrowly scoped related adjustment is required.
- Do not change item creation, link validation, widget copy, breakpoint controls, or tooltip behavior.
- Do not add frontend tests.
- Reduced motion must remain instantaneous.

## Verification checklist

- In an authenticated editor page, click Link and observe the pill recenter and resize without a left-edge jump.
- Return to the toolbar, click Widget, and observe the same continuous resize.
- Repeat Link → toolbar and Widget → toolbar; closes must remain responsive.
- Inspect sampled bounds during entry: `x` and `width` should both progress from the old rectangle to the new rectangle instead of `x` snapping immediately.
- Confirm the Link input still receives autofocus and the existing controls remain clickable.
- Confirm `prefers-reduced-motion` still yields no motion.

