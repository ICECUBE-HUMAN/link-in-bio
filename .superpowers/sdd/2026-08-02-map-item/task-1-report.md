# Task 1 report

Date: August 1, 2026
Workspace: `/Users/kinmongsang/Documents/KINMONGSANG/sinabro/.worktrees/map-item`
Task: Mapbox dependency와 공유 camera contract 추가

## Scope completed

- Added `react-map-gl`, `mapbox-gl`, and `@types/mapbox-gl` to `apps/frontend/package.json` and updated the root `bun.lock` through the required `bun add --cwd apps/frontend ...` command.
- Added optional `VITE_MAPBOX_ACCESS_TOKEN` client env support in `apps/frontend/src/env.ts`.
- Created `apps/frontend/src/lib/map/map-config.ts` with:
  - required Mapbox style URL
  - Tokyo default location
  - zoom bounds
  - `MapCamera`
  - `normalizeMapCamera`
  - `isSameMapCamera`
  - non-throwing `getMapboxAccessToken()`
- Extended `packages/api/src/grid.ts` map schema with optional bounded `zoom`.
- Updated `apps/frontend/src/lib/grid/item-factory.ts` map defaults to Tokyo + zoom 12 by reusing the new shared map config.
- Added controller coverage in `apps/backend/src/controllers/page-items.controller.test.ts` for:
  - valid zoom persisted through the batch API boundary
  - invalid zoom 23 rejected with 422 and not stored
  - legacy map payload without zoom accepted

## Validation run

Commands requested by the brief:

1. `bun run --filter @sinabro/frontend typecheck`
   - Failed due to a pre-existing unrelated error:
   - `src/components/layout/sections/feature-section.tsx(1,42): error TS2307: Cannot find module 'framer-motion'`
2. `bun run --filter @sinabro/frontend check`
   - Failed due to pre-existing unrelated frontend Biome/format issues in files outside this task, including:
   - `src/components/grid/grid-motion.css`
   - `src/components/auth/cta-button.tsx`
   - `src/components/grid/renderers/map.tsx`
   - `src/components/layout/sections/cta-section.tsx`
   - `vite.config.ts`
3. `bun run --filter @sinabro/backend check`
   - Passed
4. `bun --cwd apps/backend test src/controllers/page-items.controller.test.ts`
   - Passed: 13 tests, 0 failures

Additional focused checks on touched files:

- `bunx biome check apps/frontend/src/env.ts packages/api/src/grid.ts apps/frontend/src/lib/grid/item-factory.ts apps/frontend/src/lib/map/map-config.ts`
  - Passed
- `bunx biome check src/controllers/page-items.controller.test.ts` (from `apps/backend`)
  - Passed
- `git diff --check`
  - Passed

## Self-review

- Reused the new shared frontend constants in `item-factory` instead of duplicating Tokyo defaults.
- Kept the API route/controller behavior unchanged; only schema acceptance and tests changed at the boundary.
- Did not add any backend geocoding route, frontend test file, or speculative shared abstraction beyond the brief.
- Kept legacy map payloads valid by making `zoom` optional in the shared schema and using normalization only in the new frontend config module.
- Left latitude/longitude untouched in normalization per the brief; only zoom falls back to 12 when missing/invalid/out of range.

## Concerns

- The required frontend workspace checks are currently blocked by unrelated pre-existing issues outside this task, so full workspace green status is not available from this run.
- `react-map-gl` brings both Mapbox and optional MapLibre package entries into `bun.lock`; this came from the requested dependency installation and was not manually expanded.

---

## Fix round 1 report

Date: August 1, 2026
Reason: reviewer requested a shared save-time camera sanitization helper so later renderer/editor work can reuse the Task 1 contract instead of duplicating Mapbox event validation.

### Fix applied

- Added `sanitizeMapCamera(data)` to `apps/frontend/src/lib/map/map-config.ts`.
- Behavior:
  - returns `undefined` when `latitude`, `longitude`, or `zoom` is non-finite
  - preserves finite `latitude` and `longitude`
  - clamps finite `zoom` into `0..22`
- Kept `normalizeMapCamera` unchanged for persisted-data normalization and legacy zoom fallback.

### Covering commands and output

1. Focused frontend touched-file Biome check

```text
$ bunx biome check apps/frontend/src/env.ts packages/api/src/grid.ts apps/frontend/src/lib/grid/item-factory.ts apps/frontend/src/lib/map/map-config.ts
Checked 4 files in 6ms. No fixes applied.
```

2. Backend check

```text
$ bun run --filter @sinabro/backend check
@sinabro/backend check: Exited with code 0
```

3. Page items controller test

```text
$ bun --cwd apps/backend test src/controllers/page-items.controller.test.ts
$ bun test src/controllers/page-items.controller.test.ts
bun test v1.3.11 (af24e281)

src/controllers/page-items.controller.test.ts:
(pass) pageItemsController > requires authentication for item upload
(pass) pageItemsController > rejects path traversal filenames before signing an upload
(pass) pageItemsController > rejects malformed JSON with a client error
(pass) pageItemsController > rejects duplicate and conflicting batch item IDs
(pass) pageItemsController > completes an uploaded media object after checking its metadata
(pass) pageItemsController > applies multiple new items in one batch
(pass) pageItemsController > stores deterministic initial metadata for link items
(pass) pageItemsController > preserves map zoom when a valid map item is created
(pass) pageItemsController > rejects map zoom outside the shared schema boundary
(pass) pageItemsController > accepts legacy map payloads without zoom
(pass) pageItemsController > enriches a saved link through the metadata endpoint
(pass) pageItemsController > rejects metadata for a link whose URL changed
(pass) pageItemsController > does not persist empty text or section items in a mixed batch

13 pass
0 fail
27 expect() calls
Ran 13 tests across 1 file.
```

### Typecheck note

- I did not rerun `bun run --filter @sinabro/frontend typecheck` because the previous Task 1 run already showed an unrelated pre-existing blocker outside this fix:
  - `src/components/layout/sections/feature-section.tsx(1,42): error TS2307: Cannot find module 'framer-motion' or its corresponding type declarations.`

### Self-review

- The new helper is the smallest reusable export that later Mapbox move/view-state code can call directly.
- No new dependency or extra abstraction was introduced.
- Sanitization remains centralized in `map-config`, so the later renderer does not need to duplicate finite checks or zoom clamping.
