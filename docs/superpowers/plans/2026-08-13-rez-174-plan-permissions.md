# REZ-174 Plan Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the confirmed Free/Pro page policy to Grabbin's PostgreSQL, Worker, Queue, backend API, and existing page editor without allowing client-side bypasses.

**Architecture:** Keep `creem_subscription` as the billing source of truth and derive a single server-side Pro entitlement from its product ID, status, and period end. Keep `user.primaryPageId` as the only primary pointer, add lifecycle fields to `pages`, and centralize write checks and lifecycle reconciliation in backend services. Reuse the existing daily Worker Cron and media-delete Queue; the frontend only reflects server state and never decides permission.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, PostgreSQL through Hyperdrive, Better Auth Creem plugin, Cloudflare Worker Cron and Queue, Valibot, TanStack Query, TanStack Start, React, Bun tests.

> **2026-08-13 구현 변경:** `pages.lifecycle_status`와 `PageLifecycleStatus`는 제거한다. `GET /pages`는 `hasAccess`와 `isPrimary`를 반환하고, 읽기 전용 여부는 두 값으로 계산한다. `deletion_scheduled_at`만 삭제 예약과 정기 정리에 저장한다. 아래의 이전 lifecycle 상태 열 언급은 이 변경으로 대체한다.

## Global Constraints

- Do not add `user.plan`, `pages.isPrimary`, Supabase Functions, or Supabase Triggers.
- Keep `user.primaryPageId` as the sole primary-page source of truth.
- A canceled Pro subscription remains Pro through `periodEnd`.
- After `periodEnd`, only the latest primary page remains writable during the seven-day grace period; primary changes and new page creation are denied.
- Public pages remain visible during the grace period; only owner writes are blocked.
- Never trust a browser-supplied plan, primary flag, or page ownership value.
- Primary changes and deletes must lock the user row and re-check the latest primary inside the transaction.
- Page deletion must collect owned R2 keys before DB deletion, delete DB rows in a transaction, then enqueue R2 cleanup with a scheduled orphan-cleanup fallback.
- Use the existing daily Worker Cron and extend the existing cleanup Queue rather than adding a new scheduler or Queue.
- Frontend tests are excluded by `/Users/kinmongsang/Documents/KINMONGSANG/Grabbin/AGENTS.md`; use backend tests and manual QA.
- Preserve the existing account-deletion flow and do not implement custom-domain storage in this issue.

---

## File Map

| File | Responsibility in this plan |
| --- | --- |
| `packages/api/src/index.ts` | Owner page-list response and lifecycle field schemas shared by backend and frontend |
| `apps/backend/src/db/schema.ts` | `pages` lifecycle columns and lookup index |
| `apps/backend/drizzle/` | Next generated PostgreSQL migration for the lifecycle columns |
| `apps/backend/src/core/billing.ts` | Pure billing entitlement calculation built on the existing subscription status logic |
| `apps/backend/src/services/page-lifecycle.service.ts` | Page lifecycle reconciliation, schedule/restore transitions, and deletion asset collection |
| `apps/backend/src/services/page.service.ts` | Page list, page-count gate, primary change, and page-delete business operations |
| `apps/backend/src/controllers/pages.controller.ts` | Page list, primary, delete, and page-write authorization wiring |
| `apps/backend/src/controllers/page-items.controller.ts` | Authorization wiring for item, item-media, and metadata mutations |
| `apps/backend/src/core/creem-webhook.ts` | Return accepted webhook state so lifecycle changes run only for accepted events |
| `apps/backend/src/core/auth.options.ts` | Apply schedule/restore transitions after accepted Creem events |
| `apps/backend/src/index.ts` | Daily lifecycle reconciliation, page asset Queue handling, and orphan fallback |
| `apps/backend/src/mappers/page.mapper.ts` | Map owned page summaries without leaking lifecycle data into public page responses |
| `apps/backend/src/core/plan-access.test.ts` | Pure Free/Pro entitlement and period-boundary tests |
| `apps/backend/src/services/page-lifecycle.service.test.ts` | Pure lifecycle transition and deletion-deadline tests |
| `apps/backend/src/controllers/pages.controller.test.ts` | Page count, list, primary, delete, and direct HTTP authorization tests |
| `apps/backend/src/controllers/page-items.controller.test.ts` | Read-only enforcement across item and media mutation endpoints |
| `apps/backend/src/core/creem-webhook.test.ts` | Webhook schedule/restore integration cases alongside existing ordering tests |
| `apps/frontend/src/lib/api/pages.functions.ts` | Owner page-list server function and query key |
| `apps/frontend/src/lib/api/pages-api.ts` | Page primary/delete API calls and stable error parsing |
| `apps/frontend/src/routes/$handle.tsx` | Load owner lifecycle metadata and pass read-only capability to the editor |
| `apps/frontend/src/components/page/toolbar.tsx` | Disable editor item controls for read-only pages |
| `apps/frontend/src/components/page/page-settings-menu.tsx` | Disable page settings writes and expose page management actions |
| `apps/frontend/src/components/page/page-picker.tsx` | New minimal page list/transition UI in the existing editor menu |
| `apps/frontend/src/lib/page/use-page-auto-save.ts` | Prevent local autosave attempts for a read-only page and refresh after server denial |
| `docs/qa/2026-08-13-rez-174-plan-permissions-qa.md` | Manual BDD QA record using the design's fixed scenario IDs |

## 2026-08-13 confirmed page-creation UI slice

**Goal:** Let an eligible owner create a second or third page from the existing `/$handle` editor without visiting `/new`.

**Architecture:** Extract the existing handle and role-selection steps from `apps/frontend/src/routes/new.tsx` into one shared page component. Keep `/new` as the first-page route and retain its success screen. `PagePicker`, which is rendered by `/$handle.tsx`, opens the same shared steps in a dialog and navigates to the newly created handle after the server accepts it.

**Constraints:** Do not add a frontend test under `AGENTS.md`. Do not duplicate creation validation or page-limit rules in the browser: hide the entry point when `hasAccess` is false or there are already three pages, and retain the existing server response as the authority.

### Task 7: Reuse the new-page steps in the editor

**Files:**
- Create: `apps/frontend/src/components/page/create-page-flow.tsx`
- Modify: `apps/frontend/src/routes/new.tsx`
- Modify: `apps/frontend/src/components/page/page-picker.tsx`

**Interfaces:**
- `CreatePageFlow` accepts `onCreated(handle: string): void | Promise<void>` and calls it only after `createPage` succeeds.
- `/new` passes `setCreatedHandle` and continues to show its existing success screen.
- `PagePicker` invalidates owned-page/session queries, closes its dialog, then navigates to `/$handle` with the new handle.

- [x] Extract the current handle availability check, handle form, role form, and `createPage` call into `CreatePageFlow`; keep the 400 ms availability wait and existing error copy.
- [x] Replace the duplicated steps in `/new` with `CreatePageFlow`, preserving its current success screen and confetti behavior.
- [x] Add a `New page` button to `PagePicker` only when `hasAccess` is true and fewer than three pages exist. Open `CreatePageFlow` in the existing dialog primitive; on success, refresh page data and navigate to the new page.
- [x] Run targeted Biome lint and the existing backend test suite. Record the manual UI scenario in the REZ-174 QA document; frontend tests remain intentionally excluded.

---

### Task 1: Add the shared owner-page contract and database lifecycle columns

**Files:**
- Modify: `packages/api/src/index.ts`
- Modify: `apps/backend/src/db/schema.ts`
- Create: the next Drizzle migration generated under `apps/backend/drizzle/`
- Modify: `apps/backend/src/mappers/page.mapper.ts`

**Interfaces:**
- Produces `PageLifecycleStatus = "active" | "read_only"`.
- Produces `OwnedPageSummary` with `id`, `handle`, `name`, `isPrimary`, `lifecycleStatus`, `deletionScheduledAt`, `createdAt`, and `updatedAt`.
- Produces `OwnedPageListResponse = { pages: OwnedPageSummary[] }`.
- Keeps `PageResponse` and `PageByHandleResponse` unchanged for public-page compatibility.

- [ ] **Step 1: Add the Valibot owner-list schemas**

In `packages/api/src/index.ts`, add a literal union for `active` and `read_only`, then define the summary and list response immediately beside the existing page response schemas. Keep timestamps as ISO strings and make `deletionScheduledAt` nullable.

```ts
export const pageLifecycleStatusSchema = v.union([
  v.literal("active"),
  v.literal("read_only"),
]);

export const ownedPageSummarySchema = v.object({
  id: v.string(),
  handle: pageHandleSchema,
  name: v.nullable(v.string()),
  isPrimary: v.boolean(),
  lifecycleStatus: pageLifecycleStatusSchema,
  deletionScheduledAt: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const ownedPageListResponseSchema = v.object({
  pages: v.array(ownedPageSummarySchema),
});
```

Export the inferred types and do not add lifecycle fields to the public page response.

- [ ] **Step 2: Add the database columns and index**

In `apps/backend/src/db/schema.ts`, add `lifecycleStatus` mapped to `lifecycle_status` with default `active` and `notNull`, plus nullable `deletionScheduledAt` mapped to `deletion_scheduled_at`. Add an index beginning with `deletionScheduledAt` so the daily cleanup can find due rows without scanning all pages.

- [ ] **Step 3: Generate and inspect the migration**

Run:

```bash
bun run --filter @grabbin/backend db:generate
```

Inspect the next migration under `apps/backend/drizzle/`. It must only add the two `pages` columns, apply the `active` default, and add the deletion-schedule lookup index. Do not alter the existing `user.primaryPageId`, subscription tables, or old migration checksums.

- [ ] **Step 4: Add the owner summary mapper**

In `apps/backend/src/mappers/page.mapper.ts`, add:

```ts
export const mapOwnedPageSummary = (
  page: typeof pages.$inferSelect,
  primaryPageId: string | null,
): OwnedPageSummary => ({
  id: page.id,
  handle: page.handle,
  name: page.name,
  isPrimary: page.id === primaryPageId,
  lifecycleStatus: page.lifecycleStatus,
  deletionScheduledAt: page.deletionScheduledAt?.toISOString() ?? null,
  createdAt: page.createdAt.toISOString(),
  updatedAt: page.updatedAt.toISOString(),
});
```

Validate the result with `ownedPageSummarySchema` at the controller boundary. Leave public mapping unchanged.

- [ ] **Step 5: Run the contract and schema checks**

Run:

```bash
bun run --filter @grabbin/backend check
bun run --filter @grabbin/frontend typecheck
```

Expected: both pass with the new shared types and no public response contract changes.

- [ ] **Step 6: Commit the contract slice**

```bash
git add packages/api/src/index.ts apps/backend/src/db/schema.ts apps/backend/src/mappers/page.mapper.ts apps/backend/drizzle
git commit -m "feat(REZ-174): add page lifecycle contract"
```

### Task 2: Centralize billing entitlement and page lifecycle policy

**Files:**
- Modify: `apps/backend/src/core/billing.ts`
- Create: `apps/backend/src/services/page-lifecycle.service.ts`
- Create: `apps/backend/src/core/plan-access.test.ts`
- Create: `apps/backend/src/services/page-lifecycle.service.test.ts`

**Interfaces:**
- Produces `BillingEntitlement = { tier: "free" | "pro"; hasAccess: boolean; productId: string | null; periodEnd: Date | null }` from subscription rows.
- Produces `PlanAccess = BillingEntitlement & { gracePeriod: boolean }` from subscription rows plus the user's pending page lifecycle.
- Produces `getPlanAccess({ db, userId, now }): Promise<PlanAccess>`.
- Produces `assertPageWritable({ db, userId, page, now }): Promise<void>`.
- Produces `reconcileUserPageLifecycle({ db, userId, now }): Promise<void>`.
- Produces `restoreUserPagesAfterResubscribe({ db, userId }): Promise<void>`.
- Produces `scheduleUserPagesAfterCancellation({ db, userId, periodEnd }): Promise<void>`.

- [ ] **Step 1: Write pure entitlement tests first**

In `apps/backend/src/core/plan-access.test.ts`, cover these exact cases with fixed `now` and subscription inputs:

```ts
test("recognizes an allowed active Pro product", () => {
  expect(buildPlanAccess([activeMonthlySubscription], now)).toMatchObject({
    tier: "pro",
    hasAccess: true,
  });
});

test("keeps canceled access through periodEnd", () => {
  expect(buildPlanAccess([canceledSubscriptionWithFuturePeriodEnd], now)).toMatchObject({
    tier: "pro",
    hasAccess: true,
  });
});

test("switches to grace after periodEnd", () => {
  expect(buildPlanAccess([expiredSubscription], now)).toMatchObject({
    tier: "free",
    hasAccess: false,
  });
});

test("does not treat an unknown product as Pro", () => {
  expect(buildPlanAccess([unknownProductSubscription], now).tier).toBe("free");
});

test("reports grace only when expired Pro pages await cleanup", async () => {
  await expect(
    getPlanAccess({ db: dbWithScheduledPage, userId: "user_1", now }),
  ).resolves.toMatchObject({ tier: "free", gracePeriod: true });
});
```

Use the existing `buildBillingStatus` period semantics rather than duplicating status strings in tests or controllers. Keep the Pro product allowlist beside the existing Creem product IDs and export it for the billing controller and tests. `buildPlanAccess(subscriptions, now)` returns `BillingEntitlement`; `getPlanAccess({ db, userId, now })` adds `gracePeriod` by checking whether the user still has a page with a deletion deadline.

- [ ] **Step 2: Implement the single entitlement function**

Extend `apps/backend/src/core/billing.ts` with an allowlist check and `buildPlanAccess`. A subscription is Pro only when its product ID is one of the two configured Pro IDs and its stored status/period gives access. `gracePeriod` is true when the user has a known expired Pro period and still has pages awaiting the seven-day cleanup; it is not inferred from a browser value.

`getPlanAccess` must query the user's subscriptions and return the same result used by controllers, lifecycle jobs, and webhook reconciliation.

- [ ] **Step 3: Write lifecycle transition tests**

In `apps/backend/src/services/page-lifecycle.service.test.ts`, test pure helpers or a focused fake DB for:

- cancellation schedule uses `periodEnd + 7 days`;
- current primary has no deletion deadline;
- non-primary pages receive the same deadline while remaining `active` before `periodEnd`;
- period-end reconciliation changes only non-primary pages to `read_only`;
- resubscription changes remaining pages to `active` and clears deadlines;
- a page that was manually deleted is not recreated;
- repeated reconciliation produces no additional changes.

- [ ] **Step 4: Implement lifecycle helpers with user-row locking**

In `page-lifecycle.service.ts`, make all state-changing functions use a transaction and lock the user row before reading `primaryPageId`. The period-end helper must query the current subscription and current primary inside that transaction.

Use these rules:

```ts
if (planAccess.hasAccess) {
  // All existing pages remain active and have no deletion deadline.
}

if (expiredProPeriod) {
  // Keep the current primary active.
  // Set every other page to read_only with periodEnd + 7 days.
}

if (page.deletionScheduledAt !== null && page.deletionScheduledAt <= now) {
  // Re-check current primary, collect assets, delete the non-primary page.
}
```

`assertPageWritable` must allow every page for Pro and Free's only page, allow only the current primary during grace, and throw `PAGE_READ_ONLY` for all other grace pages. It must not use `page.lifecycleStatus` as the only permission check.

- [ ] **Step 5: Run the policy tests and typecheck**

Run:

```bash
bun test apps/backend/src/core/plan-access.test.ts apps/backend/src/services/page-lifecycle.service.test.ts
bun run --filter @grabbin/backend check
```

Expected: all new tests pass and no controller has its own independent Pro-status rules.

- [ ] **Step 6: Commit the policy slice**

```bash
git add apps/backend/src/core/billing.ts apps/backend/src/services/page-lifecycle.service.ts apps/backend/src/core/plan-access.test.ts apps/backend/src/services/page-lifecycle.service.test.ts
git commit -m "feat(REZ-174): centralize page entitlement policy"
```

### Task 3: Add page listing, creation limits, primary change, and delete APIs

**Files:**
- Modify: `apps/backend/src/services/page.service.ts`
- Modify: `apps/backend/src/controllers/pages.controller.ts`
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/src/controllers/pages.controller.test.ts`

**Interfaces:**
- Produces `listOwnedPages({ db, userId }): Promise<OwnedPageSummary[]>`.
- Produces `changePrimaryPage({ db, userId, handle, now }): Promise<void>`.
- Produces `deleteOwnedPage({ db, env, userId, handle, queue, executionCtx, now }): Promise<void>`.
- Adds `GET /pages`, `PATCH /pages/:handle/primary`, and `DELETE /pages/:handle`.

- [ ] **Step 1: Add failing controller tests for page management**

Extend `apps/backend/src/controllers/pages.controller.test.ts` with these cases:

```ts
test("lists owned pages with one derived primary", async () => {
  const response = await app.request("/pages", { headers: authHeaders });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ pages: [primarySummary, secondarySummary] });
});

test("rejects a fourth page for Pro", async () => {
  const response = await app.request("/pages", {
    method: "POST",
    headers: jsonAuthHeaders,
    body: JSON.stringify(createFourthPageInput),
  });
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "PAGE_LIMIT_REACHED" });
});

test("rejects primary change for a grace-period user", async () => {
  const response = await app.request("/pages/secondary/primary", {
    method: "PATCH",
    headers: authHeaders,
  });
  expect(response.status).toBe(403);
});

test("never deletes the current primary", async () => {
  const response = await app.request("/pages/primary", {
    method: "DELETE",
    headers: authHeaders,
  });
  expect(response.status).toBe(403);
});
```

Also cover a non-owned target and an unauthenticated request with the existing test harness.

- [ ] **Step 2: Implement the owner page list**

Add `listOwnedPages` to `page.service.ts`. Query pages by `userId`, order by `createdAt` and `id`, and map `isPrimary` from the locked/current user primary ID. Do not use a client-provided page ID to derive primary.

Add `GET /pages` before the dynamic `/:handle` route in `pages.controller.ts`, require a user, run lifecycle reconciliation for the authenticated user, then return `ownedPageListResponseSchema`.

- [ ] **Step 3: Add the Pro page-count gate to creation**

Change the existing `assertEligibleUser`/creation flow so the first page remains allowed when `primaryPageId` is null. For an existing page owner, count owned pages inside the creation transaction, call `getPlanAccess`, and reject when the count is already 3 or access is not Pro. Preserve the existing atomic first-page assignment and unique-handle error behavior.

Use `PAGE_LIMIT_REACHED` for both UI and direct HTTP callers. Do not accept a plan or count from the request body.

- [ ] **Step 4: Implement atomic primary change**

Add `changePrimaryPage` and `PATCH /pages/:handle/primary`. Resolve the target page from the handle under the locked user row, require Pro access, and update only `user.primaryPageId`. If the requested page is already primary, return success without a second write.

When a pending cancellation schedule exists, clear it for the new primary and assign the same deadline to the old primary. Do not permit this endpoint during grace.

- [ ] **Step 5: Implement manual non-primary deletion**

Add `deleteOwnedPage` and `DELETE /pages/:handle`. Under the user lock, re-read the current primary and reject it with `PRIMARY_PAGE_DELETE_FORBIDDEN`. Allow a non-primary delete for Pro and for a grace-period account. Collect profile-image and media object keys before deleting the page row; PostgreSQL cascades `page_items`.

Return `204` after the DB transaction commits. Send collected keys to the existing Queue after commit; if sending fails, log the failure for the scheduled orphan sweep and do not restore deleted DB rows.

- [ ] **Step 6: Run page controller tests and typecheck**

Run:

```bash
bun test apps/backend/src/controllers/pages.controller.test.ts
bun run --filter @grabbin/backend check
```

Expected: existing first-page behavior remains green and new direct HTTP bypass tests pass.

- [ ] **Step 7: Commit the page management slice**

```bash
git add apps/backend/src/services/page.service.ts apps/backend/src/controllers/pages.controller.ts apps/backend/src/controllers/pages.controller.test.ts apps/backend/src/index.ts
git commit -m "feat(REZ-174): add page management permissions"
```

### Task 4: Enforce read-only permissions across every existing write route

**Files:**
- Modify: `apps/backend/src/controllers/pages.controller.ts`
- Modify: `apps/backend/src/controllers/page-items.controller.ts`
- Modify: `apps/backend/src/services/page.service.ts`
- Modify: `apps/backend/src/controllers/page-items.controller.test.ts`
- Modify: `apps/backend/src/controllers/pages.controller.test.ts`

**Interfaces:**
- Consumes `assertPageWritable({ db, userId, page, now })` from Task 2.
- Produces one consistent denial for page info, profile image, item, upload, and metadata mutations.

- [ ] **Step 1: Add failing read-only tests for all mutation families**

Add fixtures for a grace-period user with writable primary `A` and read-only page `B`. Verify that direct requests to B return `403` with `PAGE_READ_ONLY` for:

- `PATCH /pages/B`;
- `POST /pages/B/image-upload`;
- `POST /pages/B/image-upload/complete`;
- `POST /pages/B/items/upload`;
- `POST /pages/B/items/upload/complete`;
- `POST /pages/B/metadata`;
- `PATCH /pages/B/batch`.

Also verify that the same requests against A remain allowed and that public `GET /pages/B` remains available.

- [ ] **Step 2: Wire the shared gate into page and profile writes**

In `pages.controller.ts`, after authentication and owned-page resolution, call `assertPageWritable` before update, profile-image upload, and profile-image completion. Keep upload-key validation and stale-upload checks after authorization so a read-only request cannot create a staging object.

- [ ] **Step 3: Wire the shared gate into item and metadata writes**

In `page-items.controller.ts`, resolve the owned page before each upload endpoint and call `assertPageWritable`. For metadata and batch routes, use the same handle ownership resolution before calling the existing service. Do not add route-specific copies of the grace rule.

- [ ] **Step 4: Verify item-service callers cannot bypass the policy**

Keep the controller gate as the HTTP boundary and add a service-level assertion at the shared page mutation entry if an existing internal caller can invoke it without the controller. Confirm all current callers with:

```bash
rg -n "persistPageItemBatch|enrichPageItemMetadata|createItemMediaUpload|completeItemMediaUpload|updatePage|createProfileImageUpload|completeProfileImageUpload" apps/backend/src
```

Do not add a second independent authorization algorithm; reuse `assertPageWritable`.

- [ ] **Step 5: Run backend mutation tests**

Run:

```bash
bun test apps/backend/src/controllers/pages.controller.test.ts apps/backend/src/controllers/page-items.controller.test.ts
bun run --filter @grabbin/backend check
```

Expected: every read-only mutation is denied while public reads and primary writes remain correct.

- [ ] **Step 6: Commit the mutation-gate slice**

```bash
git add apps/backend/src/controllers/pages.controller.ts apps/backend/src/controllers/page-items.controller.ts apps/backend/src/services/page.service.ts apps/backend/src/controllers/pages.controller.test.ts apps/backend/src/controllers/page-items.controller.test.ts
git commit -m "feat(REZ-174): enforce read-only page writes"
```

### Task 5: Connect accepted Creem webhooks and the daily lifecycle job

**Files:**
- Modify: `apps/backend/src/core/creem-webhook.ts`
- Modify: `apps/backend/src/core/auth.options.ts`
- Modify: `apps/backend/src/core/creem-webhook.test.ts`
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/src/core/r2.ts`
- Modify: `apps/backend/src/services/page-lifecycle.service.ts`

**Interfaces:**
- Changes `syncCreemWebhookState` to return whether the incoming event was accepted and the resolved subscription state.
- Consumes `scheduleUserPagesAfterCancellation` and `restoreUserPagesAfterResubscribe`.
- Produces `reconcileDuePageLifecycles({ db, env, queue, executionCtx, now }): Promise<void>`.

- [ ] **Step 1: Add webhook lifecycle tests before wiring hooks**

Extend `apps/backend/src/core/creem-webhook.test.ts` with these exact assertions:

```ts
test("accepted cancellation schedules non-primary pages for periodEnd plus seven days", async () => {
  await handleAcceptedCancellation(cancellationEvent);
  expect(nonPrimaryPage.deletionScheduledAt).toEqual(addDays(periodEnd, 7));
  expect(nonPrimaryPage.lifecycleStatus).toBe("active");
});

test("accepted Pro event restores remaining scheduled pages", async () => {
  await handleAcceptedActive(activeEvent);
  expect(remainingPage.lifecycleStatus).toBe("active");
  expect(remainingPage.deletionScheduledAt).toBeNull();
});

test("stale webhook does not mutate page lifecycle", async () => {
  await handleStaleEvent(staleEvent);
  expect(pageRows).toEqual(previousPageRows);
});
```

Keep the existing signature and ordering cases unchanged.

- [ ] **Step 2: Return accepted-state information from subscription sync**

Modify `syncCreemWebhookState` so callers can distinguish `accept` from `restore` without duplicating the ordering check. Preserve the conditional update that protects `lastWebhookId` and `lastWebhookCreatedAt`.

- [ ] **Step 3: Apply lifecycle changes only after accepted events**

In `apps/backend/src/core/auth.options.ts`, make `syncSubscriptionEvent` call the lifecycle service only when the subscription sync accepts the event. Treat active, trialing, paid, and other effective Pro events as restore candidates; treat cancellation/update events with `periodEnd` as schedule candidates. `onCheckoutCompleted` must use the same accepted-state path.

If an accepted event has a `periodEnd` already in the past, immediately run period-end reconciliation instead of leaving the account waiting for Cron.

- [ ] **Step 4: Extend the Queue payload and R2 key validation**

Keep the existing `{ objectKey }` message shape, but extend the consumer's validator in `apps/backend/src/index.ts` to accept item-media, profile-image, profile-image-crop, and profile-image-staging keys only when they match the owned `users/{userId}/{pageId}/...` layout. Do not permit arbitrary R2 keys.

- [ ] **Step 5: Implement daily reconciliation and orphan fallback**

In `apps/backend/src/index.ts`, call `reconcileDuePageLifecycles` from the existing `scheduled` handler before or alongside the current orphan cleanup. It must:

- lock and reconcile expired accounts;
- set non-primary pages to `read_only` after `periodEnd`;
- delete due non-primary pages only after re-checking the latest primary;
- collect profile and item-media keys before DB deletion;
- enqueue keys after commit;
- treat missing pages as already complete.

Extend the existing orphan sweep to include page profile asset validators so Queue send failures are eventually repaired.

- [ ] **Step 6: Run webhook and Worker checks**

Run:

```bash
bun test apps/backend/src/core/creem-webhook.test.ts apps/backend/src/core/plan-access.test.ts apps/backend/src/services/page-lifecycle.service.test.ts
bun run --filter @grabbin/backend check
```

Expected: accepted, duplicate, stale, expired, restore, and repeated cleanup cases pass without changing existing REZ-175 behavior.

- [ ] **Step 7: Commit the lifecycle execution slice**

```bash
git add apps/backend/src/core/creem-webhook.ts apps/backend/src/core/auth.options.ts apps/backend/src/core/creem-webhook.test.ts apps/backend/src/index.ts apps/backend/src/core/r2.ts apps/backend/src/services/page-lifecycle.service.ts
git commit -m "feat(REZ-174): reconcile page lifecycle from billing events"
```

### Task 6: Add the page picker and read-only editor behavior

**Files:**
- Modify: `apps/frontend/src/lib/api/pages.functions.ts`
- Modify: `apps/frontend/src/lib/api/pages-api.ts`
- Create: `apps/frontend/src/components/page/page-picker.tsx`
- Modify: `apps/frontend/src/routes/$handle.tsx`
- Modify: `apps/frontend/src/components/page/toolbar.tsx`
- Modify: `apps/frontend/src/components/page/page-settings-menu.tsx`
- Modify: `apps/frontend/src/lib/page/use-page-auto-save.ts`

**Interfaces:**
- Consumes `OwnedPageListResponse` from `@grabbin/api`.
- Produces `getOwnedPages`, `changePrimaryPage`, and `deletePage` client helpers.
- Produces a `readOnly` capability derived from the server page summary and current primary ID.

- [ ] **Step 1: Add owner-page API functions and query keys**

In `apps/frontend/src/lib/api/pages.functions.ts`, add a server function for `GET /pages`, parse `ownedPageListResponseSchema`, and export `OWNED_PAGES_QUERY_KEY = ["pages", "owned"] as const`. Keep the existing `MY_PAGE_QUERY_KEY` unchanged.

In `apps/frontend/src/lib/api/pages-api.ts`, add:

```ts
export async function changePrimaryPage(handle: string): Promise<void>;
export async function deletePage(handle: string): Promise<void>;
```

Parse server error JSON into a stable `{ code, message }` object so UI can distinguish `PAGE_READ_ONLY`, `PAGE_LIMIT_REACHED`, and primary-delete errors without exposing provider details.

- [ ] **Step 2: Add the page picker using existing page-menu primitives**

Create `page-picker.tsx` as the smallest component that renders the owned page list, current primary marker, lifecycle badge, deletion deadline, and navigation to `/$handle`. Use the existing popover/button styles; do not create a new page-management route.

The picker must:

- disable primary-change controls for Free and grace users;
- disable primary-page delete;
- allow confirmed non-primary delete during Pro and grace;
- show the Pro upgrade action when page creation is denied;
- invalidate `OWNED_PAGES_QUERY_KEY`, `MY_PAGE_QUERY_KEY`, and the active handle query after a successful mutation.

- [ ] **Step 3: Pass server lifecycle capability into the editor**

In `apps/frontend/src/routes/$handle.tsx`, load the owner page list only for the authenticated owner and match the current handle to its summary. Pass `readOnly` and `isPrimary` to `Toolbar`, `PageSettingsMenu`, and the autosave hook. Keep unauthenticated public rendering unchanged.

- [ ] **Step 4: Disable all editor writes in read-only mode**

In `toolbar.tsx`, disable item creation and layout-edit controls when `readOnly` is true. In `page-settings-menu.tsx`, disable handle/name/profile-image writes while still allowing logout and account deletion. In `use-page-auto-save.ts`, skip mutation creation when the capability is read-only and invalidate/refetch after a `PAGE_READ_ONLY` response.

Do not rely only on disabled controls: the backend gate from Task 4 remains authoritative.

- [ ] **Step 5: Run frontend static checks**

Run:

```bash
bun run --filter @grabbin/frontend check
bun run --filter @grabbin/frontend typecheck
bun run --filter @grabbin/frontend build
```

Do not add or run new frontend tests. Manually inspect that public page rendering and the existing editor motion remain intact.

- [ ] **Step 6: Commit the frontend slice**

```bash
git add apps/frontend/src/lib/api/pages.functions.ts apps/frontend/src/lib/api/pages-api.ts apps/frontend/src/components/page/page-picker.tsx 'apps/frontend/src/routes/$handle.tsx' apps/frontend/src/components/page/toolbar.tsx apps/frontend/src/components/page/page-settings-menu.tsx apps/frontend/src/lib/page/use-page-auto-save.ts
git commit -m "feat(REZ-174): add page picker and read-only editor state"
```

### Task 7: Complete backend regression coverage and the manual QA record

**Files:**
- Modify: `apps/backend/src/controllers/pages.controller.test.ts`
- Modify: `apps/backend/src/controllers/page-items.controller.test.ts`
- Modify: `apps/backend/src/core/creem-webhook.test.ts`
- Modify: `apps/backend/src/controllers/billing.controller.test.ts`
- Create: `docs/qa/2026-08-13-rez-174-plan-permissions-qa.md`

**Interfaces:**
- Consumes the design checklist IDs `PLAN-001`, `PLAN-002`, `PRIMARY-001`, `PRIMARY-002`, `READONLY-001`, `DELETE-001`, `DELETE-002`, `RESTORE-001`, and `CLEANUP-001` without renaming or replacing them.
- Produces a QA record with `Pass`, `Fail`, `Blocked`, or `Not Run` results and evidence fields.

- [ ] **Step 1: Add remaining backend regression tests**

Cover:

- Free second-page creation through direct HTTP;
- Pro third-page success and fourth-page rejection;
- foreign-page primary target rejection;
- concurrent primary change/delete protection;
- primary deletion rejection for Pro and grace;
- repeated page deletion and repeated lifecycle reconciliation;
- Queue payload validation for profile and item assets;
- billing status response compatibility;
- accepted/stale webhook schedule and restore behavior.

Use the existing controller test fakes and database fixtures. Do not introduce a new test framework or frontend test file.

- [ ] **Step 2: Write the manual QA document from the design checklist**

Create `docs/qa/2026-08-13-rez-174-plan-permissions-qa.md` with:

- purpose and scope;
- test environment and test-mode Creem account/data;
- baseline page IDs, primary ID, subscription period end, and R2 keys;
- one section per fixed scenario ID with `Given`, `When`, `Then`, `Evidence`, and result;
- irreversible-delete cleanup instructions;
- separate `보조 검증` cases for Queue failure fallback and stale frontend state;
- exact follow-up issue field for any `Fail` or `Blocked` result.

- [ ] **Step 3: Run the complete backend suite**

Run:

```bash
bun run --filter @grabbin/backend test
bun run --filter @grabbin/backend check
```

Expected: all existing and new backend tests pass. If a baseline test fails outside this feature, record the exact command and failure in the QA document instead of changing unrelated code.

- [ ] **Step 4: Commit verification artifacts**

```bash
git add apps/backend/src/controllers/pages.controller.test.ts apps/backend/src/controllers/page-items.controller.test.ts apps/backend/src/core/creem-webhook.test.ts apps/backend/src/controllers/billing.controller.test.ts docs/qa/2026-08-13-rez-174-plan-permissions-qa.md
git commit -m "test(REZ-174): verify plan permission lifecycle"
```

### Task 8: Run final cross-boundary verification and handoff

**Files:**
- Modify only if verification finds a REZ-174 defect: the exact owned file from the failing task
- Read: `docs/superpowers/specs/2026-08-13-rez-174-plan-permissions-design.md`
- Read: `docs/qa/2026-08-13-rez-174-plan-permissions-qa.md`

- [ ] **Step 1: Run focused backend checks**

```bash
bun test apps/backend/src/core/plan-access.test.ts apps/backend/src/services/page-lifecycle.service.test.ts apps/backend/src/core/creem-webhook.test.ts apps/backend/src/controllers/pages.controller.test.ts apps/backend/src/controllers/page-items.controller.test.ts
```

- [ ] **Step 2: Run workspace static checks**

```bash
bun run check
bun run build
```

Do not interpret static checks as proof of webhook delivery, R2 deletion, or production state.

- [ ] **Step 3: Run the browser/manual scenarios**

Use the QA document and verify at minimum:

- Free cannot create a second page or change/delete primary;
- Pro can create up to three pages, change primary, and delete non-primary;
- canceled Pro remains editable through `periodEnd`;
- after `periodEnd`, only the latest primary remains writable;
- direct HTTP writes to a read-only page fail;
- re-subscription clears the schedule and restores remaining pages;
- scheduled cleanup protects the latest primary and removes secondary page assets.

- [ ] **Step 4: Record evidence boundaries**

Separate local tests, Worker/Queue runtime checks, database queries, browser checks, and Creem Test mode webhook evidence in the QA document. Do not claim production deployment or real Creem delivery without matching external evidence.

- [ ] **Step 5: Prepare the Linear handoff**

Attach the final QA document to REZ-174 Resources and add a comment linking the design, implementation plan, and QA scope. Do not mark REZ-174 Done until implementation, verification, and all required child issues are complete.

## Verification Command Summary

```bash
bun run --filter @grabbin/backend test
bun run --filter @grabbin/backend check
bun run --filter @grabbin/frontend check
bun run --filter @grabbin/frontend typecheck
bun run --filter @grabbin/frontend build
bun run check
bun run build
```

The frontend command set is static validation only; no frontend test file is added by this plan.
