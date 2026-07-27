# Feature Preview UI Design

## Goal

Replace the placeholder `featurePreviewMap` previews with two auto-playing product-like visualizations that clearly communicate Drag & Drop and Rich Content.

## Design

`FeatureSection2` will continue to render the preview selected by each `FEATURE_ITEMS` entry. The preview keys will become `drag-drop` and `rich-content`, matching the feature names instead of the current generic `type-tester` and `layout-animation` names.

The Drag & Drop preview will show three colored cards and destination slots. On a repeating cycle, one card moves to its corresponding slot with a subtle spring, rotation, and scale change. The motion is explanatory decoration only; the preview has no user interaction or state that needs to be persisted.

The Rich Content preview will show a small page frame containing text, image, and link blocks. The blocks will enter in a short stagger and then reset for the next loop, communicating that different content types can be composed into one page.

## Motion and accessibility

- Use the existing `framer-motion` dependency and `motion` components already used in the file.
- Prefer layout/transform/opacity animation and a custom ease-out curve or subtle spring; avoid animating layout dimensions directly.
- Keep the loop around three seconds and make the state readable at rest.
- Use `useReducedMotion` so reduced-motion users see stable, fully visible previews without positional animation.
- Keep the components self-contained in `feature-section.tsx`; no new dependency or global CSS is needed.

## Scope

- Modify `apps/frontend/src/components/layout/sections/feature-section.tsx`.
- Modify `apps/frontend/src/constant/features.ts` only to rename the two preview keys.
- Preserve unrelated in-progress changes in the workspace.
