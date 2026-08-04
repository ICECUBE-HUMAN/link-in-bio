# Grid map visibility design

## Goal

그리드의 공개 지도 아이템은 첫 viewport 진입까지는 lazy mount하되, 한 번
Mapbox surface가 mount된 뒤에는 화면 밖으로 나가도 같은 인스턴스를 유지한다.
지도 재진입 시 Mapbox 초기화와 tile/style 재요청으로 발생하는 깜빡임·비용을
줄이는 것이 목적이다.

## Root causes

- `MapViewportGate`가 `IntersectionObserver`의 `isIntersecting` 값을 그대로
  `isNearViewport`에 넣어 viewport 밖에서 `children`을 제거한다.
- 제거된 `MapboxMapSurface`는 Mapbox instance/canvas를 정리하고, 재진입 때
  dynamic import와 style/tile 초기화 경계를 다시 통과한다.

## Decisions

### Map

- `MapViewportGate`는 `hasMounted`를 한 번만 `false → true`로 바꾼다.
- 최초 near-viewport 진입 전에는 기존 크기의 placeholder만 렌더링한다.
- 최초 진입 이후에는 observer가 `false`를 보고해도 Mapbox children을 제거하지
  않는다.
- edit mode의 `forceMount`는 기존처럼 즉시 mount를 보장한다.
- 지도 instance를 pool/reuse하거나 새 global store를 만들지 않는다. 이 변경은
  현재 map item의 lifecycle 정책만 바꾼다.

## Scope

Modify:

- `apps/frontend/src/components/grid/map/map-viewport-gate.tsx`

Documentation:

- this design document
- `docs/superpowers/plans/2026-08-04-grid-map-media-visibility.md`

Do not add frontend tests. Verify with focused Biome/typecheck/build and, where a
live authenticated page is available, browser lifecycle/visual inspection.

## Verification checklist

- Initial public map outside viewport shows the fixed-size placeholder and does not
  initialize Mapbox until within the 200px root margin.
- After a map has entered once, scrolling it away and back keeps one map/canvas
  instance and does not show the placeholder or reinitialize transition.
- Existing edit-mode map interaction, drag cancellation, media caption/action, and
  reduced-motion behavior remain intact.
