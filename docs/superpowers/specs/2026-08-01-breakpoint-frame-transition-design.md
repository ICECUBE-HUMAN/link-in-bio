# Breakpoint Frame Transition Design

## 목적

편집 화면에서 `compact ↔ wide` 프리뷰를 전환할 때 프레임과 페이지 레이아웃이 끊기지 않고 하나의 연속된 모션으로 이동하도록 한다.

- `compact → wide`: 모바일 프레임의 좌우 꼭짓점이 함께 바깥으로 퍼지며 wide 프레임으로 확장되고, 수직 위치도 위로 튀지 않고 최종 위치까지 이동한다.
- `wide → compact`: wide 프레임의 양쪽 꼭짓점이 함께 안쪽으로 줄어들며 모바일 프레임이 나타나고, 중앙 정렬 위치로 부드럽게 이동한다.
- 기존의 `fade out → breakpoint/layout 교체 → fade in` 순서, 저장 flush, reduced-motion 계약은 유지한다.

## 현재 원인

`apps/frontend/src/routes/$handle.tsx`의 프레임은 `motion.div layout="size"`를 사용한다. 이 모드는 크기만 투영하고 위치는 투영하지 않는다. breakpoint 상태가 바뀌는 한 번의 렌더에서 `main`의 `items-center/items-start`와 프레임의 compact/wide 폭·높이가 함께 변경되므로, 위치는 즉시 새 값으로 바뀌고 크기는 별도로 애니메이션되어 다음 현상이 발생한다.

- compact→wide: 중앙 정렬에서 상단 정렬로 바뀌는 y 위치가 먼저 적용되어 프레임이 위로 튄다.
- wide→compact: 중앙의 모바일 프레임으로 이동하는 x/y 위치가 크기 변화와 분리되어 상하 모션이 끊긴다.

또한 `.t-breakpoint-frame`가 `width/height`를 CSS transition으로 보간하면서 Motion의 layout projection과 같은 크기 값을 동시에 조작한다. 이중 보간은 프레임의 변환을 예측하기 어렵게 만든다.

## 설계

### 1. 전체 레이아웃 투영

프레임의 `motion.div`를 `layout="size"`에서 `layout`으로 변경한다. Motion이 이전 프레임의 전체 bounding box와 새 프레임의 전체 bounding box를 비교해 `x`, `y`, `width`, `height`를 하나의 layout transition으로 보간하게 한다. 이 방식은 컴팩트 프레임의 양쪽 모서리가 동시에 이동하는 시각적 결과를 만들며, DOM 레이아웃 자체를 수동으로 계산하거나 별도 transform을 합성하지 않는다.

기존의 350ms strong ease-out과 `shouldReduceMotion` 분기는 유지한다.

### 2. 크기 transition의 단일 권위

`.t-breakpoint-frame`에서 `width`와 `height` transition 및 `will-change`를 제거한다. 프레임 크기와 위치는 Motion만 조작한다. 프레임 모서리와 배경색의 시각적 morph는 CSS transition으로 유지한다.

### 3. 전환 상태와 자식 콘텐츠

`useBreakpointTransition`의 타이머 기반 네 단계 상태와 `t-breakpoint-crossfade`의 자식 fade는 변경하지 않는다. 전환 중 GridSection이 breakpoint별 layout을 교체하고 remount하는 동작도 유지한다. 콘텐츠는 기존처럼 프레임 이동 중 숨겨져 있어 내부 RGL 재배치가 사용자에게 튀어 보이지 않는다.

## 범위

변경 대상은 다음 두 파일로 제한한다.

- `apps/frontend/src/routes/$handle.tsx`: 프레임 Motion layout 모드
- `apps/frontend/src/styles/motion.css`: 프레임 크기 CSS transition 제거

다음은 변경하지 않는다.

- breakpoint 상태 머신, flushPendingChanges, API/저장 로직
- compact/wide 독립 layout 데이터
- GridSection/RGL 동작 및 item entrance motion
- Toolbar copy, controls, frontend 테스트 추가

## 검증 기준

### 정적 검증

- `bun run --filter @sinabro/frontend typecheck`
- `bunx biome check apps/frontend/src/routes/$handle.tsx apps/frontend/src/styles/motion.css`
- `bun run --filter @sinabro/frontend build`
- `git diff --check`

### 브라우저 검증

인증된 편집 페이지에서 다음을 반복한다.

1. wide→compact: 양쪽 프레임 모서리가 함께 안쪽으로 이동하고 모바일 프레임이 중앙에 도착한다. 위·아래가 한 번에 팍 줄어들지 않는다.
2. compact→wide: 양쪽 프레임 모서리가 함께 바깥으로 이동하고 프레임이 최종 wide 위치로 내려가거나 올라갈 때 y가 튀지 않는다.
3. wide→compact→wide를 연속 반복해 toolbar가 잠기지 않고 전환이 idle로 돌아온다.
4. reduced-motion 환경에서는 전환이 즉시 끝난다.

전환 중 프레임의 `getBoundingClientRect()`를 샘플링해 시작/종료 rectangle 사이에서 `x`, `y`, `width`, `height`가 함께 진행되는지 확인한다.
