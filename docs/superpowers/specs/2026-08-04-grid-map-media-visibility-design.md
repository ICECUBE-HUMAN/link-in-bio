# Grid map/media visibility design

## Goal

그리드의 공개 지도 아이템은 첫 viewport 진입까지는 lazy mount하되, 한 번
Mapbox surface가 mount된 뒤에는 화면 밖으로 나가도 같은 인스턴스를 유지한다.
지도 재진입 시 Mapbox 초기화와 tile/style 재요청으로 발생하는 깜빡임·비용을
줄이는 것이 목적이다.

미디어 아이템은 초기 그리드 entry motion 때문에 카드 전체가 빈 영역처럼
보이지 않도록 한다. 먼저 `DEFAULT_IMAGE_DATA_URL`을 표시하고, 실제 media URL의
image load 또는 video loaded-data 경계가 지나면 실제 미디어를 위에 표시한다.

## Root causes

- `MapViewportGate`가 `IntersectionObserver`의 `isIntersecting` 값을 그대로
  `isNearViewport`에 넣어 viewport 밖에서 `children`을 제거한다.
- 제거된 `MapboxMapSurface`는 Mapbox instance/canvas를 정리하고, 재진입 때
  dynamic import와 style/tile 초기화 경계를 다시 통과한다.
- `GridItemShell`의 `.grid-item-initial-enter.is-entering`은 초기 렌더링 동안
  shell 전체를 `opacity: 0`으로 만든다. 미디어 렌더러 내부의 placeholder가
  있어도 shell이 투명하므로 빈 grid 영역이 먼저 보인다.

## Decisions

### Map

- `MapViewportGate`는 `hasMounted`를 한 번만 `false → true`로 바꾼다.
- 최초 near-viewport 진입 전에는 기존 크기의 placeholder만 렌더링한다.
- 최초 진입 이후에는 observer가 `false`를 보고해도 Mapbox children을 제거하지
  않는다.
- edit mode의 `forceMount`는 기존처럼 즉시 mount를 보장한다.
- 지도 instance를 pool/reuse하거나 새 global store를 만들지 않는다. 이 변경은
  현재 map item의 lifecycle 정책만 바꾼다.

### Media

- 미디어 shell의 초기 entry opacity/transform을 media item에만 적용하지 않고,
  renderer가 placeholder → actual media 전환을 담당한다.
- `DEFAULT_IMAGE_DATA_URL`을 항상 actual media 아래에 둔다.
- actual image는 `onLoad`, video는 `onLoadedData` 이후 opacity를 `1`로 한다.
- media URL이 없는 pending 상태는 data URL만 표시한다.
- caption/action 및 기존 media URL 계약은 변경하지 않는다.

## Scope

Modify:

- `apps/frontend/src/components/grid/map/map-viewport-gate.tsx`
- `apps/frontend/src/components/grid/renderers/media.tsx`
- `apps/frontend/src/components/grid/grid-item-shell.tsx`
- `apps/frontend/src/components/grid/grid-motion.css`

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
- Initial media card shows the data URL placeholder rather than a transparent/empty
  grid area.
- Actual image/video replaces the placeholder after its own load boundary.
- Existing edit-mode map interaction, drag cancellation, media caption/action, and
  reduced-motion behavior remain intact.
