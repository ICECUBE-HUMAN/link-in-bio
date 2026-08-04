# Grid map/media visibility implementation plan

## Goal

Fix repeated Mapbox unmount/remount flicker and make the initial media reveal show
the data URL placeholder before the actual media.

## Tasks

- [x] Change `MapViewportGate` from reversible viewport visibility to a sticky
  `hasMounted` gate. Keep the 200px root margin and edit-mode `forceMount` path.
- [x] Split media rendering into a data URL placeholder layer and an actual media
  layer. Fade the actual layer in from `onLoad`/`onLoadedData` without changing card
  dimensions.
- [x] Exempt only initial media cards from shell-level initial opacity/transform so
  the media renderer can show its placeholder immediately. Keep new-item entry and
  all non-media initial entry behavior unchanged.
- [x] Run focused formatting/lint/typecheck/build and inspect the final diff. Report
  browser verification separately if no authenticated runtime is available.

## Verification checklist

### MAP-MEDIA-001: First viewport entry

Given a public grid with a map card outside the viewport and a media card in the
initial grid render, when the page is loaded and scrolled toward the cards, then the
map initially retains its placeholder, mounts within the 200px margin, and media
shows the data URL before its actual asset loads.

Evidence: DOM mount state, Mapbox/canvas count, computed opacity, media `src`, and
screen capture or browser inspection.

### MAP-MEDIA-002: Map re-entry

Given a map card that has already entered the viewport, when it is scrolled outside
the viewport and then back into view, then the map surface remains mounted and the
saved camera/canvas are retained without a placeholder-to-map remount flash.

Evidence: same map/canvas element identity before and after scroll, no unmount log,
and visual inspection.

### MAP-MEDIA-003: Media load transition

Given an image or video media item with a valid media URL, when the asset load
boundary completes, then the data URL placeholder remains underneath and the actual
asset becomes visible without changing the grid card size.

Evidence: `onLoad`/`onLoadedData` state, computed opacity, stable card bounds, and
visual inspection.

### MAP-MEDIA-004: Regression boundaries

Given edit mode, reduced-motion preference, media caption/action, and map drag
interaction, when the affected grid controls are used, then existing behavior and
RGL drag cancellation remain unchanged.

Evidence: focused Biome, frontend typecheck/build, and manual browser inspection if
available.
