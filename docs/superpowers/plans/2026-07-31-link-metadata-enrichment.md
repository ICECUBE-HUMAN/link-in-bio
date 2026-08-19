# Link Metadata Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist links immediately with deterministic metadata, then enrich them through `POST /pages/:handle/metadata` and update the visible item without polling.

**Architecture:** Keep the existing batch persistence path for the first response. Add shared link URL validation and backend initial-metadata helpers, a modular provider registry plus bounded generic fetcher, and a metadata endpoint that conditionally updates the current link item. The frontend submits normalized input, renders the batch response immediately, marks the item as enriching locally for Skeleton rendering, then replaces the item from the metadata response.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, Valibot, Cloudflare Worker `fetch`, React, TanStack Query, React Grid Layout, Biome, Bun.

## Global Constraints

- `mailto:` and HTTPS are valid link protocols; host-like input is normalized to `https://` before submission.
- Initial batch persistence must not wait for external URL fetches.
- Metadata enrichment endpoint is exactly `POST /pages/:handle/metadata`.
- No Queue is used for link enrichment; an in-flight frontend request may be aborted when the page unmounts.
- Provider selection is modular and specific providers must be able to override the generic provider.
- Provider adapters use official APIs when the corresponding Worker secrets are configured, then fall back to generic OG metadata on missing credentials or provider failure.
- Generic fetches are bounded by timeout, response type, and body size.
- Frontend tests are not added or run unless explicitly requested; use scoped checks and manual browser verification.

---

### Task 1: Shared link contracts and initial metadata

**Files:**
- Modify: `packages/api/src/grid.ts`
- Create: `apps/backend/src/services/link-metadata.service.ts`
- Test: `apps/backend/src/services/link-metadata.service.test.ts`

**Interfaces:**
- Produce `normalizeLinkUrl(value: string): string`.
- Produce `createInitialLinkMetadata(url: string): { title: string; faviconUrl?: string }`.
- Produce link URL validation that accepts only normalized HTTPS or `mailto:` URLs.

- [ ] Update the shared link schema and URL helper types for HTTPS and `mailto:`.
- [ ] Add tests for protocol insertion, protocol preservation, invalid protocols, mailto initial metadata, and DuckDuckGo favicon URL construction.
- [ ] Run the focused backend service test and observe the expected failure before implementation, then implement the smallest passing behavior.
- [ ] Run `bun run --filter @grabbin/backend check`.

### Task 2: Provider registry and bounded enrichment

**Files:**
- Create: `apps/backend/src/services/link-providers.ts`
- Modify: `apps/backend/src/services/link-metadata.service.ts`
- Test: `apps/backend/src/services/link-providers.test.ts`

**Interfaces:**
- Produce `LinkProvider` with `id`, `priority`, `match(url)`, and `enrich(url, context)`.
- Produce `resolveLinkProvider(url: URL): LinkProvider`.
- Produce generic HTML metadata extraction with timeout and body-size limits.

- [ ] Add mailto and generic providers, keeping provider matching synchronous and network-free.
- [ ] Add registry tests proving mailto precedence, generic fallback, provider priority, bounded fetch behavior, HTML title/description/OG-image extraction, and failure degradation.
- [ ] Implement YouTube Data API v3 channel/video enrichment, including channel statistics, uploads-playlist latest thumbnail, and video statistics.
- [ ] Implement Twitch Helix enrichment for channel profile, follower total, live stream data, and latest VOD; use a broadcaster/moderator User Access Token with the required scope for follower totals.
- [ ] Implement CHZZK official Open API channel/current-live enrichment and explicitly fall back for VOD/clips because no documented official recent-VOD endpoint is available.
- [ ] Implement Discord invite counts and Bot-authenticated channel/guild counts; do not invent images when the API has no icon/banner hash.
- [ ] Keep credentials in Worker bindings and local `apps/backend/.env.local`; never embed API keys, tokens, or provider default image URLs in source.
- [ ] Run focused provider tests and backend typecheck.

### Task 3: Immediate batch metadata and metadata endpoint

**Files:**
- Modify: `apps/backend/src/services/page-item.service.ts`
- Modify: `apps/backend/src/controllers/page-items.controller.ts`
- Modify: `apps/backend/src/index.ts` only if the Worker surface needs a shared handler adjustment
- Test: `apps/backend/src/controllers/page-items.controller.test.ts`

**Interfaces:**
- `POST /pages/:handle/metadata` accepts `{ itemId: string; url: string }` and returns `{ item: PageItemResponse }`.
- Batch link upserts receive deterministic initial metadata before insert/update.

- [ ] Add the metadata request schema and endpoint route with authentication and ownership checks.
- [ ] Add conditional URL matching before metadata persistence so stale responses cannot overwrite changed links.
- [ ] Update batch persistence to merge initial title/favicon metadata for link items without external I/O.
- [ ] Extend controller tests for immediate metadata, endpoint success, mailto success, unauthorized/missing/non-link/stale URL rejection, and external enrichment fallback.
- [ ] Run the backend controller/service tests and backend typecheck.

### Task 4: Frontend submit and enrichment lifecycle

**Files:**
- Modify: `apps/frontend/src/components/page/toolbar.tsx`
- Modify: `apps/frontend/src/routes/$handle.tsx`
- Modify: `apps/frontend/src/components/grid/grid-section.tsx`
- Modify: `apps/frontend/src/components/grid/item-renderer.tsx`
- Modify: `apps/frontend/src/lib/grid/item-registry.ts`
- Modify: `apps/frontend/src/components/grid/renderers/link.tsx`
- Create or modify: `apps/frontend/src/lib/api/link-metadata-api.ts`

**Interfaces:**
- Toolbar emits a normalized HTTPS/mailto URL on submit, including paste-triggered submit.
- Handle page tracks a set of enriching item IDs and removes an ID on response, abort, or failure.
- Link renderer receives `isEnriching` and renders Skeleton only for network-dependent metadata surfaces.

- [ ] Change the page editor to use persisted items and preserve the existing batch autosave flow.
- [ ] Normalize input, submit on paste, support Enter/button submit, and keep the control disabled only for invalid input.
- [ ] After batch acknowledgment, immediately show the item and fire `POST /pages/:handle/metadata` without blocking the grid update.
- [ ] Replace the matching item in the editor store/query cache on enrichment response and abort the request on unmount.
- [ ] Add Skeleton treatment for pending image/description UI while retaining initial title/favicon.
- [ ] Run frontend typecheck, lint/check, and build; do not add frontend tests.

### Task 5: End-to-end verification and diff review

**Files:**
- Modify only files required by verification findings.

- [ ] Inspect the complete branch diff for scope, stale Queue assumptions, and API path consistency.
- [ ] Run backend tests, backend check, frontend check/typecheck/build, and relevant package checks.
- [ ] Perform browser QA for submit, paste, auto-HTTPS, mailto, immediate Skeleton, metadata replacement, and page-unmount abort behavior.
- [ ] Record any unavailable browser/runtime evidence separately from passing static checks.
