# Link title read-mode line breaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve explicit line breaks in read-only link titles for all multi-line presets.

**Architecture:** Keep the fix in the shared `LinkTitle` component so every link preset receives the same whitespace policy. Add the read-only `whitespace-pre-line` utility only when the preset is not the intentionally single-line `halfBanner` preset, remove read-mode line clamping, and allow overflow to scroll inside the title region without a visible scrollbar.

**Tech Stack:** React, TypeScript, Tailwind CSS utilities, existing frontend validation/build tooling.

## Global Constraints

- Do not add frontend tests unless explicitly requested.
- Preserve unrelated dirty-tree changes.
- Keep `halfBanner` single-line and truncated.
- Do not modify persisted data or backend/API contracts.

---

### Task 1: Fix shared link-title read rendering

**Files:**
- Modify: `apps/frontend/src/components/grid/renderers/link.tsx` in `LinkTitle`

**Interfaces:**
- Consumes: existing `title`, `preset`, and `mode` values.
- Produces: the same title content with explicit newlines preserved in read mode for multi-line presets.

- [ ] **Step 1: Add the read-mode whitespace utility**

  In the read-mode `<div>` class list, add `whitespace-pre-line` when `preset !== "halfBanner"`, omit all `line-clamp-*` classes, and use `no-scrollbar overflow-y-auto` for multi-line presets. Keep `truncate` for `halfBanner`.

- [ ] **Step 2: Review the complete preset matrix**

  Confirm the shared class applies to `squareSmall`, `landscape`, `squareLarge`, and `portrait`, while `halfBanner` remains unchanged.

- [ ] **Step 3: Run frontend validation**

  Run the repository's existing frontend typecheck/build or equivalent validation command discovered from `apps/frontend/package.json`. Expected: the command completes without errors attributable to this change.

- [ ] **Step 4: Inspect the focused diff**

  Run `git diff -- apps/frontend/src/components/grid/renderers/link.tsx` and confirm only the shared read-mode class behavior changed; leave unrelated user edits untouched.

### Manual QA / Verification Contract

- Given a link title containing explicit newlines or blank lines, when viewing `landscape`, `squareSmall`, `squareLarge`, or `portrait`, then the original content remains visible without a generated ellipsis; excess content scrolls inside the title area.
- Given the same title, when editing it, then the native textarea and its existing wrapping behavior remain unchanged.
- Given a link title in `halfBanner`, when viewing it, then it remains a single-line truncated title.
