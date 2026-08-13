# REZ-164 Creem 결제·구독 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Better Auth 공식 Creem 플러그인으로 Checkout, 구독 저장·webhook 갱신, 인증 사용자용 상태 조회를 연결한다.

**Architecture:** 서버 Better Auth가 Creem plugin과 `persistSubscriptions: true`를 사용해 구독 데이터를 저장한다. 프론트는 기존 `authClient`에 `creemClient()`를 추가하고, 별도 billing 상태 API는 저장된 구독을 읽어 안전한 snapshot을 반환한다.

**Tech Stack:** TypeScript, Hono, Better Auth 1.6, `@creem_io/better-auth`, Drizzle ORM, PostgreSQL, Bun.

## Global Constraints

- Creem 결제·구독 자격 증명은 사이트 매출 제공자 자격 증명과 분리한다.
- 사용자 인증 경계 밖에서는 결제·구독 데이터를 반환하지 않는다.
- Creem secret과 webhook secret은 로그와 화면에 노출하지 않는다.
- 프론트엔드 테스트는 추가하지 않는다.
- 상세 webhook 중복·순서 테스트는 선행 이슈 `REZ-175`에서 처리한다.

---

### Task 1: Creem plugin configuration and database migration

**Files:**
- Modify: `apps/backend/src/core/auth.options.ts`
- Modify: `apps/backend/src/db/schema.ts`
- Modify: `apps/backend/worker-configuration.d.ts`
- Modify: `apps/backend/wrangler.jsonc`
- Modify: `apps/backend/.env.local.example` if present, otherwise document names in backend README
- Create: `apps/backend/drizzle/<generated-creem-migration>.sql`

**Interfaces:**
- Consumes: `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_TEST_MODE`, `CREEM_SUCCESS_URL`.
- Produces: Better Auth `/auth/creem/*` endpoints and Drizzle `creemSubscription` table metadata.

- [ ] **Step 1: Add server plugin configuration**

```ts
import { creem } from "@creem_io/better-auth";

plugins: [
  magicLink(/* existing options */),
  creem({
    apiKey: env.CREEM_API_KEY,
    webhookSecret: env.CREEM_WEBHOOK_SECRET,
    testMode: env.CREEM_TEST_MODE === "true",
    defaultSuccessUrl: env.CREEM_SUCCESS_URL,
    persistSubscriptions: true,
  }),
],
```

Keep the existing auth plugins and cookie configuration unchanged.

- [ ] **Step 2: Add the plugin schema to Drizzle**

Add `creemCustomerId` and `hadTrial` to `user`, then add `creemSubscription` mapped to `creem_subscription`. Keep all plugin field names in camelCase and map database columns to snake_case, matching the existing schema style.

- [ ] **Step 3: Add the required Cloudflare binding types and secret names**

Add the four Creem values to `CloudflareBindings`/`ProcessEnv` and the Wrangler required secret list. Do not add secret values to tracked files.

- [ ] **Step 4: Generate the Drizzle migration**

Run:

```bash
bun run --cwd apps/backend db:generate
```

Expected: one new migration creates the user columns and `creem_subscription` table without changing existing Better Auth tables.

- [ ] **Step 5: Inspect the migration and schema diff**

Run:

```bash
git diff --check
git diff -- apps/backend/src/db/schema.ts apps/backend/drizzle apps/backend/src/core/auth.options.ts
```

Confirm the migration has a foreign key from `reference_id` to `user.id`, indexes for `reference_id` and `creem_subscription_id`, and no secret values.

### Task 2: Billing status projection API

**Files:**
- Create: `apps/backend/src/core/billing.ts`
- Create: `apps/backend/src/controllers/billing.controller.ts`
- Modify: `apps/backend/src/index.ts`
- Create: `apps/backend/src/core/billing.test.ts`
- Create: `apps/backend/src/controllers/billing.controller.test.ts`

**Interfaces:**
- Consumes: `creemSubscription` rows and `AuthUser` from the existing middleware.
- Produces: `GET /billing/status` returning `BillingStatusResponse`.

- [ ] **Step 1: Write the failing projection tests**

```ts
import { describe, expect, it } from "bun:test";
import { buildBillingStatus } from "./billing";

describe("billing status", () => {
  it("returns none when the user has no subscription", () => {
    expect(buildBillingStatus([])).toEqual({ status: "none", hasAccess: false });
  });

  it("grants access only for an active status inside the paid period", () => {
    const result = buildBillingStatus([
      {
        status: "active",
        periodStart: new Date("2026-08-01T00:00:00Z"),
        periodEnd: new Date("2026-09-01T00:00:00Z"),
        productId: "prod_10k",
        cancelAtPeriodEnd: true,
      },
    ], new Date("2026-08-13T00:00:00Z"));

    expect(result).toMatchObject({
      status: "active",
      hasAccess: true,
      productId: "prod_10k",
      cancelAtPeriodEnd: true,
    });
  });

  it("does not grant access after the period ends", () => {
    expect(buildBillingStatus([
      {
        status: "canceled",
        periodStart: new Date("2026-07-01T00:00:00Z"),
        periodEnd: new Date("2026-08-01T00:00:00Z"),
        productId: "prod_10k",
        cancelAtPeriodEnd: true,
      },
    ], new Date("2026-08-13T00:00:00Z")).hasAccess).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
bun test apps/backend/src/core/billing.test.ts
```

Expected: failure because `buildBillingStatus` does not exist.

- [ ] **Step 3: Implement the pure status projection**

Use the newest row by `periodEnd`, normalize the raw status to lowercase, and set `hasAccess` only when the status is `active`, `trialing`, or `paid` and `periodEnd` is null or later than the requested time. Return `none` for an empty list.

- [ ] **Step 4: Add the authenticated Hono controller**

`GET /billing/status` must return `401` when `c.get("user")` is null. For an authenticated user, query `creemSubscription` by `referenceId = user.id`, order by `periodEnd desc`, and return the pure projection. Do not return customer IDs or secret values.

- [ ] **Step 5: Wire the route and run focused tests**

Run:

```bash
bun test apps/backend/src/core/billing.test.ts apps/backend/src/controllers/billing.controller.test.ts
```

Expected: projection and authentication boundary tests pass.

### Task 3: Frontend Creem client contract

**Files:**
- Modify: `apps/frontend/src/lib/auth/auth-client.ts`

**Interfaces:**
- Consumes: existing Better Auth client configuration.
- Produces: `authClient.creem.createCheckout`, `createPortal`, `retrieveSubscription`, and `hasAccessGranted`.

- [ ] **Step 1: Add `creemClient()` to the existing client plugin list**

```ts
import { creemClient } from "@creem_io/better-auth/client";

plugins: [
  magicLinkClient(),
  creemClient(),
  inferAdditionalFields(/* existing fields */),
],
```

- [ ] **Step 2: Run frontend typecheck**

Run:

```bash
bun run --cwd apps/frontend check
```

Expected: the existing auth client remains type-safe and Creem methods are available.

### Task 4: Verification and Linear update

**Files:**
- Modify: `apps/backend/README.md` with local webhook and migration commands if no environment example exists

- [ ] **Step 1: Run backend checks**

```bash
bun run --cwd apps/backend typecheck
bun test apps/backend/src/core/billing.test.ts apps/backend/src/controllers/billing.controller.test.ts
```

- [ ] **Step 2: Run the existing backend test suite**

```bash
bun run --cwd apps/backend test
```

Record unrelated baseline failures separately; do not repair them in this issue.

- [ ] **Step 3: Verify the generated migration and route contract**

Use a local database with `bun run --cwd apps/backend db:migrate`, then verify `GET /billing/status` returns `401` without a session and `status: "none"` for a fresh authenticated user.

- [ ] **Step 4: Update Linear**

Add the design and plan documents to `REZ-164` Resources, comment the verification evidence, and leave `REZ-175` open for the detailed webhook test scope. Set `REZ-164` to `Done` only after the implementation and checks pass; otherwise leave it `In Progress` with the exact blocker.
