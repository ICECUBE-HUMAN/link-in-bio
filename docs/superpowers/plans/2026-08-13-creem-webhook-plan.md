# REZ-175 Creem 웹훅 처리 및 테스트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공식 Creem Better Auth 웹훅의 서명 검증과 구독 상태 동기화를 유지하면서 중복·순서 역전에도 최신 상태가 보존되도록 한다.

**Architecture:** `/auth/creem/webhook`은 공식 `@creem_io/better-auth` endpoint가 처리한다. 플러그인 callback은 `creem_subscription`의 마지막 승인 이벤트 메타데이터와 상태 스냅샷을 비교해 오래된 이벤트를 무시하고 승인 상태를 복원한다. 별도 웹훅 endpoint와 이벤트 로그 테이블은 만들지 않는다.

**Tech Stack:** TypeScript, Better Auth, `@creem_io/better-auth`, Drizzle ORM, PostgreSQL, Bun tests.

## Global Constraints

- 공식 Creem 플러그인의 `creem-signature` 검증과 `/auth/creem/webhook` 경계를 유지한다.
- Creem API secret과 webhook secret은 코드·DB·로그에 저장하지 않는다.
- 별도 웹훅 이벤트 로그 테이블과 Creem API 재조회는 추가하지 않는다.
- 프론트엔드 테스트는 추가하지 않는다.
- 오래된 이벤트는 최신 승인 상태를 덮어쓰지 않아야 한다.

---

### Task 1: Webhook state schema and migration

**Files:**
- Modify: `apps/backend/src/db/schema.ts`
- Create: generated `apps/backend/drizzle/<next-creem-webhook-state>.sql`
- Create: generated `apps/backend/drizzle/meta/<next-snapshot>.json`
- Modify: `apps/backend/drizzle/meta/_journal.json`

**Interfaces:**
- Consumes: existing `creem_subscription` rows created by migration 0008.
- Produces: nullable `lastWebhookId`, `lastWebhookCreatedAt`, and `lastWebhookState` fields used by the sync callback.

- [ ] **Step 1: Add the three nullable state fields**

```ts
lastWebhookId: text("last_webhook_id"),
lastWebhookCreatedAt: timestamp("last_webhook_created_at"),
lastWebhookState: jsonb("last_webhook_state").$type<CreemWebhookState | null>(),
```

Keep the fields nullable so rows created by migration 0008 remain valid.

- [ ] **Step 2: Generate the forward migration**

Run:

```bash
bun run --cwd apps/backend db:generate
```

Expected: one migration adds only the three nullable columns to `creem_subscription`.

- [ ] **Step 3: Inspect the migration**

Run:

```bash
git diff --check
bunx drizzle-kit check --config apps/backend/drizzle.config.ts
```

Confirm no existing migration is edited and no secret value appears.

### Task 2: Idempotent and ordered webhook state projection

**Files:**
- Create: `apps/backend/src/core/creem-webhook.ts`
- Create: `apps/backend/src/core/creem-webhook.test.ts`

**Interfaces:**
- Consumes: `CreemWebhookState | null` and the normalized state from a verified plugin callback.
- Produces:

```ts
export type CreemWebhookState = {
  webhookId: string;
  webhookCreatedAt: number;
  status: string;
  productId: string;
  creemCustomerId: string | null;
  creemSubscriptionId: string;
  creemOrderId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type WebhookStateDecision =
  | { action: "accept"; state: CreemWebhookState }
  | { action: "restore"; state: CreemWebhookState };

export function decideCreemWebhookState(
  previous: CreemWebhookState | null,
  incoming: CreemWebhookState,
): WebhookStateDecision;
```

- [ ] **Step 1: Write focused failing tests**

Use two snapshots with the same subscription ID and these exact assertions:

```ts
const first = state({ webhookId: "evt_1", webhookCreatedAt: 100 });
const newer = state({ webhookId: "evt_2", webhookCreatedAt: 200, status: "paid" });
const older = state({ webhookId: "evt_0", webhookCreatedAt: 50, status: "expired" });

expect(decideCreemWebhookState(null, first)).toEqual({ action: "accept", state: first });
expect(decideCreemWebhookState(first, newer)).toEqual({ action: "accept", state: newer });
expect(decideCreemWebhookState(newer, older)).toEqual({ action: "restore", state: newer });
expect(decideCreemWebhookState(newer, newer)).toEqual({ action: "restore", state: newer });
```

- [ ] **Step 2: Implement the comparison**

Use `webhookCreatedAt` as the ordering key. Accept only when there is no previous state or the incoming timestamp is greater than the previous timestamp. For equal or smaller timestamps, return `restore` with the previous snapshot.

- [ ] **Step 3: Add signature verification checks**

Use the official `validateWebhookSignature` helper in the test with a Web Crypto HMAC-SHA256 signature. Verify a valid signature returns `true`, a changed payload returns `false`, and a missing signature returns `false`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
bun test apps/backend/src/core/creem-webhook.test.ts
```

Expected: all projection and signature cases pass.

### Task 3: Connect official plugin callbacks to durable state protection

**Files:**
- Modify: `apps/backend/src/core/auth.ts`
- Modify: `apps/backend/src/core/auth.options.ts`
- Modify: `apps/backend/src/db/schema.ts` only if callback update types require a narrow exported state type

**Interfaces:**
- Consumes: official Creem callbacks for checkout and subscription events, `DatabaseClient`, and `decideCreemWebhookState`.
- Produces: every supported verified event updates only the newest accepted state in `creem_subscription`.

- [ ] **Step 1: Pass the existing database client into auth options**

Extend the internal options argument with `db: DatabaseClient` from `createAuth(env, db)`. Do not create a new connection for each webhook.

- [ ] **Step 2: Normalize callback payloads**

Map callback data into `CreemWebhookState` using the flattened product/customer/subscription values. Convert Creem date values to ISO strings and set `cancelAtPeriodEnd` for cancellation-at-period-end events.

- [ ] **Step 3: Apply the decision after plugin persistence**

Find the row by `creemSubscriptionId`. For `accept`, update the row's webhook metadata and normalized status fields. For `restore`, update the row back from the previous snapshot. Keep the operation idempotent and avoid logging identifiers.

- [ ] **Step 4: Register callbacks for supported event types**

Register callbacks for `checkout.completed`, `subscription.active`, `subscription.trialing`, `subscription.canceled`, `subscription.paid`, `subscription.expired`, `subscription.unpaid`, `subscription.update`, `subscription.past_due`, and `subscription.paused`. Preserve the official plugin's default callback behavior.

- [ ] **Step 5: Run backend tests**

Run:

```bash
bun test apps/backend
```

Expected: existing tests and all new webhook tests pass.

### Task 4: Remote migration, verification, and Linear update

**Files:**
- Modify: `apps/backend/README.md` with the new state-migration note if needed

- [ ] **Step 1: Apply the new migration to the configured remote Supabase database**

Run:

```bash
bun run --cwd apps/backend db:migrate
```

Then verify the three columns exist and the latest Drizzle migration hash matches the local file.

- [ ] **Step 2: Run final checks**

```bash
bun test apps/backend
bunx drizzle-kit check --config apps/backend/drizzle.config.ts
git diff --check
```

- [ ] **Step 3: Update Linear**

Attach this plan and the design document to REZ-175, comment the exact test and remote migration evidence, then set REZ-175 to `Done` only when the local and remote checks pass. REZ-164 can then be unblocked for its remaining acceptance checks.
