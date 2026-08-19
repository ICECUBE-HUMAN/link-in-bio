# REZ-168 Billing UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep static pricing and checkout on the home page while moving page management and plan changes into `PageSettingsMenu`.

**Architecture:** Reuse the existing `/pages` owned-page query as the single source for page lists and the Free/Pro access flag. Keep checkout creation in `PlanSection` without a billing-status read, and reuse the existing Creem portal client from the settings menu.

**Tech Stack:** React 19, TanStack Router, TanStack Query, Hono server functions, Better Auth Creem client, existing Button/Popover components, Tailwind CSS.

## Global Constraints

- Do not add frontend tests unless explicitly requested.
- Do not add dependencies or backend billing endpoints.
- `PlanSection` must not call `/billing/status` or switch its label based on subscription state.
- Use `@grabbin/plan` for product IDs and call `authClient.creem.createCheckout({ productId })`; keep the anonymous `/log-in` redirect.
- Remove the unused `/billing/checkout` backend route and its request schema.
- Use `getOwnedPages().hasAccess` for Free/Pro display and keep the server as the authority for page permissions.
- Do not add separate expired, canceled, or grace-period UI, and do not add upgrade guidance for limit errors.

---

### Task 1: Update the static pricing section

**Files:**
- Modify: `apps/frontend/src/components/layout/sections/plan-section.tsx`

**Interfaces:**
- Consumes: existing `authClient.getSession`, `authClient.creem.createCheckout`, `PlanPeriod`, and `PRO_PLANS` from `@grabbin/plan`.
- Produces: a static Free/Pro pricing display whose Pro action starts checkout without reading billing status.

- [ ] **Step 1: Remove billing-status state and request**

  Delete `hasActiveSubscription`, the `/billing/status` fetch, and the branch that calls `authClient.creem.createPortal()`.

- [ ] **Step 2: Keep checkout behavior**

  Keep the session check, `/log-in` redirect, `createCheckout({ productId })` call, loading state, and error message.

- [ ] **Step 3: Keep static plan rendering**

  Keep the Free/Pro cards, monthly/yearly selector, and existing feature labels. Make the Pro button label independent of subscription state, such as `Choose Pro · Monthly` or `Choose Pro · Yearly`.

- [ ] **Step 4: Run focused formatting**

  Run `bunx biome check apps/frontend/src/components/layout/sections/plan-section.tsx`.

### Task 2: Move page management into PageSettingsMenu

**Files:**
- Modify: `apps/frontend/src/components/page/page-settings-menu.tsx`
- Delete: `apps/frontend/src/components/page/page-picker.tsx`

**Interfaces:**
- Consumes: `getOwnedPages`, `OWNED_PAGES_QUERY_KEY`, `MY_PAGE_QUERY_KEY`, `CreatePageFlow`, `changePrimaryPage`, `deletePage`, and `authClient.creem.createPortal`.
- Produces: `Manage page` and primary-first page management views owned by `PageSettingsMenu`.

- [ ] **Step 1: Load owned pages in the settings menu**

  Add a query using `getOwnedPages` and `OWNED_PAGES_QUERY_KEY`. Derive `planName` as `Pro` when `hasAccess` is true and `Free` otherwise. Show `Manage page` only when the loaded result has `hasAccess === true`; show `Generated pages {pages.length}/3` below it with the same `flex-col` shape as `Change handle`.

- [ ] **Step 2: Add the page-list view**

  Extend the settings view union with `pages`. Clicking `Manage page` switches to the second menu page. Add a `BackButton`, render pages sorted with `isPrimary` first, and keep each page link navigable by handle.

- [ ] **Step 3: Add icon-only page actions**

  Use icon buttons with `aria-label` values for primary and delete. Disable the primary action for the current primary page. Reuse `changePrimaryPage` and `deletePage`; after either operation invalidate the owned-pages and current-page queries. If the current page is deleted, navigate to the primary page as the old `PagePicker` did.

- [ ] **Step 4: Preserve page creation**

  Render the existing `CreatePageFlow` in a dialog from the page-list view while `pages.length < 3`. After creation, invalidate the owned-pages and current-page queries and navigate to the newly created handle.

- [ ] **Step 5: Remove the standalone picker**

  Delete `page-picker.tsx` after its only route usage is removed. Keep all page-management behavior in `PageSettingsMenu`.

- [ ] **Step 6: Run focused formatting**

  Run `bunx biome check apps/frontend/src/components/page/page-settings-menu.tsx apps/frontend/src/components/page/create-page-flow.tsx`.

### Task 3: Add plan portal controls

**Files:**
- Modify: `apps/frontend/src/components/page/page-settings-menu.tsx`

**Interfaces:**
- Consumes: `planName` from the owned-pages query and `authClient.creem.createPortal`.
- Produces: a `Change plan` item with current plan and upgrade/downgrade text.

- [ ] **Step 1: Render the plan item**

  Add a non-demo `Change plan` button with `Current plan · {planName}` and `Upgrade your plan` for Free or `Downgrade your plan` for Pro, using a `flex-col` layout.

- [ ] **Step 2: Open the Creem portal**

  On click, call `authClient.creem.createPortal()`. Redirect to `data.url` when present; otherwise show `Billing portal could not be opened.` in the menu without changing plan state locally.

### Task 4: Remove the standalone picker and add read-only notice

**Files:**
- Modify: `apps/frontend/src/routes/$handle.tsx`

**Interfaces:**
- Consumes: existing `readOnly`, `ownedPage`, and `Page controls` aside.
- Produces: settings-only page controls plus a notice on non-primary read-only pages.

- [ ] **Step 1: Remove PagePicker rendering and import**

  Remove the `PagePicker` import and its sibling render from the `Page controls` aside. Leave `PageSettingsMenu` as the page management entry point.

- [ ] **Step 2: Render the notice for additional read-only pages**

  Inside the `aria-label="Page controls"` aside, render a `div` when `readOnly && ownedPage && !ownedPage.isPrimary` with the exact text `This page is read-only and will be deleted soon.`.

- [ ] **Step 3: Run focused formatting**

  Run `bunx biome check apps/frontend/src/routes/$handle.tsx`.

### Task 5: Verify the change

**Files:**
- No test files; frontend test creation is excluded by project rules.

- [ ] **Step 1: Confirm no status lookup remains in PlanSection**

  Run `rg -n "billing/status|hasActiveSubscription|createPortal" apps/frontend/src/components/layout/sections/plan-section.tsx` and expect no matches.

- [ ] **Step 2: Build the frontend**

  Run `bun run --cwd apps/frontend build` and confirm the route compiles.

- [ ] **Step 3: Run the existing backend billing checks**

  Run `bun test --cwd apps/backend src/controllers/billing.controller.test.ts src/core/billing.test.ts src/core/plan-access.test.ts` to confirm the unchanged checkout/status contracts still pass.

- [ ] **Step 4: Check the final worktree**

  Run `git diff --check` and `git status --short`; confirm only the intended frontend files and the two REZ-168 documents changed.
