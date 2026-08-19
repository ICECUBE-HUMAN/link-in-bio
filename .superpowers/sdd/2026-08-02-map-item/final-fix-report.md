# Map item final review fix report

Date: August 2, 2026
Workspace: `/Users/kinmongsang/Documents/KINMONGSANG/sinabro/.worktrees/map-item`
Branch: `codex/map-item`

## Scope

This wave addressed all Critical/Important findings in the supplied final
review and the requested dependency cleanup. The coordinate formatter minor
finding was intentionally left unchanged because the renderer and fallback
would need a new shared boundary for only a two-line helper; that would add
coupling without reducing meaningful duplication.

No frontend tests were added or run, per the workspace instructions. Backend
files and behavior were not affected, so backend checks/tests were not run.

## Changes

### 1. Disable Mapbox box zoom outside interactive edit mode

`apps/frontend/src/components/grid/map/mapbox-map-surface.tsx` now passes
`boxZoom={interactive}`. View mode and locked edit mode therefore no longer
allow Shift-drag box zoom, while active location editing retains the existing
interactive behavior.

### 2. Queue search camera moves during lazy Mapbox initialization

The surface now keeps two local refs:

- `mapLoadedRef` records the Mapbox `onLoad` boundary.
- `pendingCameraRef` stores only the latest imperative `flyTo` request before
  load.

`flyTo` queues until load when the dynamic `mapbox-gl` import/map instance is
not ready. `handleMapLoad` applies the latest queued camera with the existing
`getFlyToDuration()` reduced-motion behavior. Calls after load use the live
`MapRef`. No store or controlled-camera refactor was introduced.

### 3. Remove the deprecated Mapbox type dependency

Ran the normal workspace command:

```text
bun remove @types/mapbox-gl --cwd apps/frontend
```

This removed `@types/mapbox-gl` from `apps/frontend/package.json` and its
workspace/package entry from `bun.lock`. `mapbox-gl` and `react-map-gl` remain
unchanged.

## Preservation review

- Existing `MAPBOX_STYLE_URL` is unchanged.
- Existing dynamic `mapLib={import("mapbox-gl")}` is unchanged.
- Existing 2D controls remain: `pitch={0}`, `maxPitch={0}`,
  `dragRotate={false}`, and `touchPitch={false}`.
- Existing navigation/geolocation controls remain gated by `interactive`.
- Existing renderer `update-data` command and autosave path are unchanged.
- Existing geolocation error separation is unchanged; geolocation failures do
  not become Mapbox initialization failures or write item data.
- No UI, fallback, caption, search, Google Maps action, or coordinate display
  was changed.
- No new utility, store, hook framework, backend code, or frontend test was
  introduced.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Focused Biome | Pass | `bunx biome check apps/frontend/src/components/grid/map/mapbox-map-surface.tsx` — one file checked, no fixes |
| Diff whitespace | Pass | `git diff --check` |
| Frontend typecheck | Blocked by pre-existing failure | `bun run --filter @grabbin/frontend typecheck` fails on missing `framer-motion` in `src/components/layout/sections/feature-section.tsx`; no map surface diagnostic was reported |
| Frontend check | Blocked by pre-existing repository diagnostics | `bun run --filter @grabbin/frontend check` reports existing `grid-motion.css` `!important`/specificity findings, formatting/import findings, and existing hook diagnostics; no map surface diagnostic was reported |
| Frontend build | Blocked by pre-existing failure | `bun run --filter @grabbin/frontend build` transforms 1217 modules and emits the Mapbox chunk, then fails resolving missing `framer-motion` from `feature-section.tsx` |
| Frontend tests | Not run | Explicitly excluded by workspace instructions |
| Backend checks/tests | Not run | No backend files or contracts changed |
| Browser Mapbox QA | Not run | No live authenticated Mapbox browser boundary was available in this wave |

## Self-review conclusion

The final review's two Important findings are fixed at the shared Mapbox
surface boundary. The readiness fix is latest-request-wins, applies exactly
once at `onLoad`, and keeps the existing reduced-motion duration policy. The
diff is limited to the surface, frontend manifest, lockfile, and this report.

Commit hash is recorded in the final task handoff after commit creation.
