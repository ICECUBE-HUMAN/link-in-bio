# Spotify Play Action Implementation Plan

**Goal:** Play Spotify playlist and track URLs in the browser when the existing `Play` action is clicked, without showing a player UI.

**Files:**

- Create: `apps/frontend/src/lib/link/spotify-embed.ts`
- Modify: `apps/frontend/src/components/grid/renderers/link.tsx`

## Task 1: Add Spotify action URL conversion

- Parse only valid Spotify `playlist` and `track` URL path segments and return a canonical Spotify URL for the Embed API.
- Support current `/playlist/<id>` and `/track/<id>` paths, optional `intl-*` prefixes, and legacy `/user/<user>/playlist/<id>` paths.
- Return `undefined` for malformed IDs or other Spotify resource types.
- Load Spotify's iFrame API once per browser session and expose only the controller methods needed for playback.

## Task 2: Use the converted URL in `Play`

- Keep badge links and the stored item URL unchanged.
- Intercept only playable Spotify `Play` actions, call `loadEntity()` and `play()`, and prevent ordinary navigation.
- Keep the Embed container 1px and offscreen so no player UI is visible.
- Keep the Embed host/controller in a module singleton rather than the preset-keyed item renderer; do not destroy it during preset changes.
- Preserve current new-tab behavior for ordinary links and unsupported Spotify resources.
- Keep the existing action label, provider styles, counts, and all non-Spotify behavior unchanged.
- Subscribe link actions to the singleton playback snapshot so only the active Spotify action reads `Stop`.
- Make `Stop` call `pause()` and cancel any pending controller-start request.

## Verification checklist

- Run `bun run --filter @sinabro/frontend check`.
- Run `bun run --filter @sinabro/frontend typecheck`.
- Inspect the diff to confirm the pre-existing title line-height edit remains untouched and no frontend tests were added.
- In an authenticated browser page, click `Play` for one Spotify track and one playlist and inspect the browser playback/controller event. If Spotify is unavailable in the environment, record that external playback evidence is blocked.
- While a track is playing, change its preset and verify playback continues without a second load or player teardown.
- While playing, verify the action label is `Stop`; click it and verify playback pauses and the label returns to `Play`.
