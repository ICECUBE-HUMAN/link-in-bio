# Spotify Play Action Design

## Goal

Make the Spotify `Play` action button start playback in the current browser when a link item contains a Spotify playlist or track URL.

## Behavior

- Keep the stored/displayed Spotify URL unchanged.
- When the provider is Spotify and the URL identifies a playlist or track, create an offscreen Spotify Embed controller for that URL.
- On `Play`, load the URL into the controller and call its `play()` method from the user click boundary.
- While the requested resource is playing, change the action label to `Stop`; clicking it calls `pause()` and restores `Play`.
- Keep the Spotify Embed element offscreen at 1px; no Spotify player UI is visible in the page.
- Keep the controller and offscreen host outside the React item tree so preset changes do not destroy playback.
- Preserve ordinary link behavior for unsupported Spotify resources and every non-Spotify provider.

## Scope boundaries

- Do not add Spotify OAuth, Web API playback controls, or audio preview playback.
- Do not rewrite persisted URLs or metadata.
- Do not change the existing provider presentation or action label.
- Do not add frontend tests; use static checks and a browser/manual URL-boundary check.

## Verification

- A playlist URL creates a browser Embed controller that loads and plays the playlist.
- A track URL creates a browser Embed controller that loads and plays the track.
- No visible Spotify player UI is added to the card or page.
- Changing the item preset leaves the active Spotify controller alive and playback continues.
- Playback updates and natural completion restore the action label to `Play`.
- Query strings, fragments, `intl-*` path prefixes, and legacy `/user/<user>/playlist/<id>` paths do not corrupt the extracted ID.
- Unsupported Spotify resources and non-Spotify links keep their original href and target behavior.
- Frontend Biome and TypeScript checks pass.
