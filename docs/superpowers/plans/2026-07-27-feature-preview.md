# Feature Preview UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build auto-playing Motion previews that visually explain Drag & Drop and Rich Content in `FeatureSection2`.

**Architecture:** Keep the existing `featurePreviewMap` lookup and render two self-contained preview components from `feature-section.tsx`. Rename the feature preview keys in the constants file so the lookup describes the actual product features. Use `useReducedMotion` to switch each preview to a stable readable state.

**Tech Stack:** React, TypeScript, Framer Motion, Tailwind CSS, existing `FEATURE_ITEMS` constants.

## Global Constraints

- Only modify the feature preview implementation and its two preview identifiers.
- Preserve unrelated working-tree changes.
- Use Motion for the explanatory animation.
- Reduced-motion mode must avoid positional animation.
- Do not add dependencies or global styles.

---

### Task 1: Align feature preview identifiers

**Files:**
- Modify: `apps/frontend/src/constant/features.ts`

**Interfaces:**
- Produces the literal preview keys `drag-drop` and `rich-content` consumed by `featurePreviewMap`.

- [ ] **Step 1: Rename the preview values**

Change the first feature preview from `type-tester` to `drag-drop` and the second from `layout-animation` to `rich-content`. Leave titles, descriptions, icons, thumbnails, and array ordering unchanged.

- [ ] **Step 2: Check the key references**

Run:

```bash
rg -n 'type-tester|layout-animation|drag-drop|rich-content' apps/frontend/src
```

Expected: only the old map entries and the new constants are identified before Task 2 updates the map.

### Task 2: Implement the animated feature previews

**Files:**
- Modify: `apps/frontend/src/components/layout/sections/feature-section.tsx`

**Interfaces:**
- `featurePreviewMap.drag-drop` renders `DragDropPreview`.
- `featurePreviewMap.rich-content` renders `RichContentPreview`.

- [ ] **Step 1: Replace placeholder map entries**

Define the map with the two new keys and component references. Remove invalid empty placeholder entries and remove unused generic preview mappings once no feature references them.

- [ ] **Step 2: Add `DragDropPreview`**

Render a compact preview with three colored cards, three rounded destination slots, and a small pointer/drag cue. Use a repeating state index to move one card at a time into its matching slot. Use `motion.div` layout animation with a subtle spring and `useReducedMotion` to render cards in their final stable arrangement without movement.

- [ ] **Step 3: Add `RichContentPreview`**

Render a centered page frame with a heading bar, text lines, an image block, and a link block. Animate the content blocks into place using `motion.div` opacity/transform with a 40–60ms stagger. Keep the final arrangement fully visible when reduced motion is enabled.

- [ ] **Step 4: Keep animation state bounded and clean**

Use an interval or timeout that is cleaned up on unmount. Keep the cycle near three seconds, and use existing imported Motion APIs only. Do not animate width, height, or margins.

### Task 3: Verify the feature preview change

**Files:**
- Test: `apps/frontend/src/components/layout/sections/feature-section.tsx`
- Test: `apps/frontend/src/constant/features.ts`

- [ ] **Step 1: Run formatting and lint checks**

Run:

```bash
bunx biome check apps/frontend/src/components/layout/sections/feature-section.tsx apps/frontend/src/constant/features.ts
```

Expected: no diagnostics for the changed files.

- [ ] **Step 2: Run the frontend typecheck**

Run:

```bash
bun run --cwd apps/frontend typecheck
```

Expected: the new preview code introduces no TypeScript errors. Report unrelated pre-existing diagnostics separately if they remain.

- [ ] **Step 3: Inspect the final diff**

Run:

```bash
git diff --check
git diff -- apps/frontend/src/components/layout/sections/feature-section.tsx apps/frontend/src/constant/features.ts
```

Confirm the diff contains only preview lookup/component changes and the two identifier renames.
