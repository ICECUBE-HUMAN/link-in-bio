# Breakpoint Frame Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the position and size discontinuities when the editor preview changes between compact and wide.

**Architecture:** Keep the existing four-state fade sequence and breakpoint data flow. Make the outer breakpoint frame's Motion layout projection the sole owner of its bounding-box animation, while CSS continues to animate only the frame's visual chrome.

**Tech Stack:** React, Motion 12 `motion.div` layout projection, CSS transitions, Vite/Bun, Biome, TypeScript.

## Global Constraints

- Preserve `fade out → breakpoint/layout 교체 → fade in`.
- Preserve `flushPendingChanges`, independent `wide`/`compact` layouts, and reduced-motion behavior.
- Do not change GridSection/RGL behavior, item entrance motion, toolbar copy, or persistence.
- Do not add frontend tests.
- Verify with frontend typecheck, scoped Biome, frontend build, `git diff --check`, and authenticated browser interaction.

---

### Task 1: Unify breakpoint frame geometry animation

**Files:**
- Modify: `apps/frontend/src/routes/$handle.tsx:272-276`
- Modify: `apps/frontend/src/styles/motion.css:250-256`
- Reference: `docs/superpowers/specs/2026-08-01-breakpoint-frame-transition-design.md`

**Interfaces:**
- Consumes: `frameLayoutTransition`, `isCompactPreview`, `showCompactCanvas`, and the existing `useBreakpointTransition` state.
- Produces: one Motion layout projection that interpolates the frame's position and size for both breakpoint directions.

- [x] **Step 1: Change the frame Motion mode**

In `apps/frontend/src/routes/$handle.tsx`, change only the outer breakpoint frame's prop:

```tsx
<motion.div
	layout
	transition={{ layout: frameLayoutTransition }}
```

Do not change the transition object, frame class computation, breakpoint state, or children. The full `layout` prop is required because `layout="size"` excludes the position change caused by the desktop alignment classes.

- [x] **Step 2: Remove duplicate CSS size transitions**

In `apps/frontend/src/styles/motion.css`, keep the `.t-breakpoint-frame` rule but reduce it to visual properties only:

```css
.t-breakpoint-frame {
	transition:
		border-radius var(--breakpoint-frame-dur) var(--page-fade-ease),
		background-color var(--breakpoint-frame-dur) var(--page-fade-ease);
}
```

Do not add a `transition: all`; Motion must be the only owner of `width`, `height`, and position. Keep the existing reduced-motion selector intact.

- [x] **Step 3: Inspect the diff for scope**

Run:

```bash
git diff -- apps/frontend/src/routes/\$handle.tsx apps/frontend/src/styles/motion.css
```

Expected: the diff contains only `layout="size"` → `layout` and removal of CSS `width`/`height` transitions. No breakpoint state, grid, toolbar, or persistence changes appear.

### Task 2: Run static verification

**Files:**
- Verify: `apps/frontend/src/routes/$handle.tsx`
- Verify: `apps/frontend/src/styles/motion.css`

**Interfaces:**
- Consumes: Task 1's source changes.
- Produces: type-safe, formatted frontend source and a successful production build.

- [x] **Step 1: Run frontend typecheck**

Run:

```bash
bun run --filter @sinabro/frontend typecheck
```

Expected: exit code 0.

- [x] **Step 2: Run scoped Biome check**

Run:

```bash
bunx biome check apps/frontend/src/routes/\$handle.tsx apps/frontend/src/styles/motion.css
```

Expected: exit code 0. Do not use `--write` unless the check reports formatting for the two changed files.

- [x] **Step 3: Run the frontend build**

Run:

```bash
bun run --filter @sinabro/frontend build
```

Expected: exit code 0 and a generated Vite production bundle.

- [x] **Step 4: Check whitespace and final source diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only the two implementation files plus the two scoped design/plan documents are changed.

### Task 3: Validate the breakpoint transition at the browser boundary

**Files:**
- Verify: authenticated editor route, expected route `http://localhost:3000/<handle>`
- Reference: `apps/frontend/src/routes/$handle.tsx`, `apps/frontend/src/styles/motion.css`

**Interfaces:**
- Consumes: the running frontend and the existing toolbar breakpoint controls.
- Produces: observed evidence that both directions interpolate position and size together and that the transition state unlocks.

- [x] **Step 1: Start or reuse the local frontend**

Run the repository's existing frontend dev command if no healthy server is available:

```bash
bun run --filter @sinabro/frontend dev
```

Use the existing authenticated editor session and page handle; do not alter saved page data during QA.

- [x] **Step 2: Exercise wide→compact**

Open the breakpoint control, switch from wide to compact, and observe the frame while content is fading. The outer frame must move from the wide bounds to the centered compact bounds without a one-frame top/bottom snap. Sample `document.querySelector('.t-breakpoint-frame')?.getBoundingClientRect()` across the transition and confirm all four values progress toward the compact rectangle.

- [x] **Step 3: Exercise compact→wide**

Switch back to wide. Confirm the compact frame expands from both horizontal sides, reaches the wide frame's position without an upward pop, and fades the wide layout back in after the frame movement. Sample the same rectangle and confirm `x`, `y`, `width`, and `height` progress continuously.

- [x] **Step 4: Repeat and record result**

Repeat wide→compact→wide at least twice. Confirm the toolbar controls become clickable after each transition and no horizontal scrollbar or stale opacity remains. Record the result as Pass/Fail with route and observed evidence; if blocked, record the exact missing auth/server dependency.

- [ ] **Step 5: Check reduced motion**

With the browser's reduced-motion preference enabled, switch both directions and confirm the state changes immediately without the frame transition.

Result: Not Run. The connected browser runtime exposed no reduced-motion emulation capability; the existing `useReducedMotion` branch and `prefers-reduced-motion` CSS rule remain unchanged.
