# Grid map visibility implementation plan

## Goal

Fix repeated Mapbox unmount/remount flicker while preserving the existing media
rendering behavior.

## Tasks

- [x] Change `MapViewportGate` from reversible viewport visibility to a sticky
  `hasMounted` gate. Keep the 200px root margin and edit-mode `forceMount` path.
- [x] Run focused formatting/lint/typecheck/build and inspect the final diff. Report
  browser verification separately if no authenticated runtime is available.

## Verification checklist

### MAP-001: First viewport entry

Given a public grid with a map card outside the viewport and a media card in the
initial grid render, when the page is loaded and scrolled toward the cards, then the
map initially retains its placeholder and mounts within the 200px margin.

Evidence: DOM mount state, Mapbox/canvas count, and browser inspection.

### MAP-002: Map re-entry

Given a map card that has already entered the viewport, when it is scrolled outside
the viewport and then back into view, then the map surface remains mounted and the
saved camera/canvas are retained without a placeholder-to-map remount flash.

Evidence: same map/canvas element identity before and after scroll, no unmount log,
and visual inspection.

### MAP-003: Regression boundaries

Given edit mode, reduced-motion preference, media caption/action, and map drag
interaction, when the affected grid controls are used, then existing behavior and
RGL drag cancellation remain unchanged.

Evidence: focused Biome, frontend typecheck/build, and manual browser inspection if
available.
