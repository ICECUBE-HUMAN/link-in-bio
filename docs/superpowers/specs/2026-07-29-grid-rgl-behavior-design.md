# React Grid Layout 동작 안정화 설계

## 1. 목적

현재 Sinabro의 그리드 편집기는 `react-grid-layout`을 사용하지만, RGL의 충돌·압축 결과와 애플리케이션의 custom axis-aware swap 결과가 분리되어 드래그 결과가 불안정하다. 이 작업은 외부 서비스의 RGL 동작 계약에서 이식 가능한 핵심 동작을 적용하되, Sinabro의 기존 계약과 충돌하는 부분은 현재 계약을 우선해 조정한다.

1차 성공 기준은 편집 화면에서 드래그, 충돌 처리, 세로 압축, 아이템 생성 위치, 화면 가장자리 자동 스크롤이 실제 사용 가능한 수준으로 안정화되는 것이다. 별도 drag intent 임계값과 custom placeholder 렌더링은 이번 범위에 포함하지 않는다.

## 2. 유지할 Sinabro 계약과 이식할 동작

### 유지

- breakpoint 이름은 `wide`와 `compact`를 사용한다.
- breakpoint별 layout을 독립적으로 저장한다.
- `wide`는 4열, `compact`는 2열이다.
- breakpoint 전환은 현재의 실제 컨테이너 폭 측정 규칙을 따른다.
- preset이 정의한 `w`와 `h`를 임의로 변경하지 않는다.
- resize는 기본 RGL handle이 아니라 별도 control에서 수행하며, 현재 범위에서는 비활성화한다.
- 새 아이템은 각 breakpoint에서 독립적으로 첫 번째 fitting rectangle에 배치한다.
- 드래그 포인터가 현재 편집 scroll container의 수직 가장자리에 머무르면 해당 container를 자동 스크롤한다.
- frontend 테스트는 추가하지 않는다.

### 이식

- 편집 모드에서만 drag를 활성화한다.
- interactive child 영역에서는 drag를 시작하지 않는다.
- 아이템 간 overlap을 허용하지 않는다.
- 충돌 시 RGL이 주변 아이템을 밀어낸다.
- 충돌 후 vertical compaction으로 빈 세로 공간을 줄인다.
- `bounded: false`로 grid 하단 아래로 이동할 수 있다.
- 최대 행 수는 48로 제한한다.
- 드래그 종료 시 드래그 아이템뿐 아니라 RGL이 재배치한 전체 layout을 저장한다.
- semantic swap을 보장하지 않는다.

## 3. 책임 경계

### `GridSection`

RGL을 화면상의 레이아웃 동작 권위자로 사용한다. 드래그 중 좌표 계산, placeholder, 충돌 밀어내기, overlap 방지, vertical compaction을 RGL에 맡긴다. 드래그 종료 시 현재 breakpoint의 전체 RGL layout을 `LayoutMap`으로 변환해 editor command로 전달한다.

### `@grabbin/grid-layout`

도메인 패키지는 breakpoint 열 수, preset geometry, 아이템 생성 위치, 저장 경계의 layout 형식·범위·overlap 검증을 담당한다. `resolveAxisAwareSwap`은 새 드래그 흐름에서 사용하지 않는다. 생성 위치 계산과 preset 검증에 필요한 기존 helper는 유지한다.

### `editor-store`

현재 breakpoint의 전체 layout map을 item layouts에 병합하고 dirty 상태 및 기존 debounce autosave를 실행한다. 저장 batch에는 RGL이 밀어낸 주변 아이템도 포함한다. 저장 응답 acknowledge와 query cache 동기화는 기존 흐름을 재사용한다.

## 4. 동작 및 데이터 흐름

1. `GridSection`은 현재 breakpoint의 `items`를 RGL layout 배열로 변환한다.
2. edit mode에서만 drag를 허용하고, interactive selector로 drag 시작을 차단한다.
3. 드래그 중에는 RGL이 placeholder와 충돌 재배치를 즉시 렌더링한다.
4. drag stop에서 RGL의 최종 layout 배열 전체를 `LayoutMap`으로 변환한다.
5. 현재 breakpoint의 layout map을 전체 교체하고 `validateLayout`으로 비중첩·범위·quarter-row 규칙을 검사한다.
6. 검증에 성공하면 store가 현재 draft를 갱신하고 기존 autosave를 예약한다.
7. batch PATCH에는 변경된 모든 item layout을 포함한다.
8. 저장 응답은 현재 draft와 충돌하지 않는 항목만 acknowledge 결과로 병합하고 query cache를 갱신한다.
9. compact와 wide 중 현재 breakpoint가 아닌 layout은 변경하지 않는다.

검증에 실패하면 해당 결과를 저장하지 않고 마지막 유효 layout을 복원하며 editor status를 error로 표시한다.

## 5. RGL 설정

개념상 설정은 다음과 같다.

```tsx
dragConfig={{
  enabled: mode === "edit",
  bounded: false,
  cancel: GRID_ITEM_DRAG_CANCEL_SELECTOR,
}}
resizeConfig={{
  enabled: false,
}}
compactor={fastVerticalCompactor}
maxRows={48}
allowOverlap={false}
```

실제 RGL v2 API의 prop 형태는 구현 단계에서 설치된 타입 정의에 맞춰 확인한다. 현재 프로젝트의 `wide`/`compact` 명칭, 실제 폭 기반 breakpoint, margin·row height 계산은 유지한다.

`GRID_ITEM_DRAG_CANCEL_SELECTOR`에는 링크, 버튼, input, textarea, select, video, contenteditable, `.grid-action`에 해당하는 현재 interactive 영역을 포함한다.

## 6. 아이템 생성

아이템 생성은 `placeAtFirstAvailable`을 유지한다.

- occupied cell을 기준으로 위쪽 행부터 왼쪽에서 오른쪽 순서로 후보를 탐색한다.
- 새 아이템의 전체 `w × h` footprint가 들어가는 첫 위치를 선택한다.
- `items.length % cols` 방식은 사용하지 않는다.
- wide와 compact는 각각 현재 layout map을 기준으로 독립 계산한다.
- 생성 후 현재 편집 스크롤 컨테이너에서 새 아이템이 보이도록 smooth scroll한다.

## 7. 예상 변경 범위

- `apps/frontend/src/components/grid/grid-section.tsx`: RGL 설정 복원, custom swap 상태 제거, 전체 layout 전달
- `apps/frontend/src/lib/grid/types.ts`: 전체 layout 변경 command 추가 또는 기존 move command 확장
- `apps/frontend/src/lib/grid/editor-store.ts`: 전체 layout map 병합 및 autosave 대상 반영
- `apps/frontend/src/lib/grid/layout-engine.ts`: 새 drag 흐름에서 swap helper 미사용화, 생성·검증 helper 유지
- `packages/grid-layout/src/index.ts`: RGL 좌표와 quarter-row 계약이 충돌하는 경우에 한해 조정
- 관련 CSS: placeholder 및 dragging item의 z-index와 시각 상태 보정

자동 스크롤은 RGL의 전용 옵션이 아니라 기존 drag callback과 `requestAnimationFrame` loop로 구현한다. 포인터가 edge region을 벗어나거나 drag가 종료·취소되면 loop를 정리한다.

관련 없는 UI redesign이나 custom drag intent 구현은 추가하지 않는다.

## 8. 오류 처리

- RGL 결과가 현재 breakpoint의 열 범위, 최소 크기, quarter-row 규칙을 위반하면 저장하지 않는다.
- overlap이 검출되면 마지막 유효 layout으로 복원한다.
- 저장 실패는 기존 editor error 상태와 재시도 흐름을 사용한다.
- 서버 acknowledge가 도착했을 때 이후 draft 변경이 있으면 최신 draft를 덮어쓰지 않는다.

## 9. 검증 기준

### 정적 검증

- backend/domain 기존 테스트
- frontend Biome, typecheck, build
- frontend 테스트 파일은 추가하지 않음

### 수동 브라우저 QA

- edit mode에서 카드가 드래그된다.
- read-only mode에서는 드래그되지 않는다.
- 버튼·입력·링크·기타 interactive child 클릭 시 카드가 이동하지 않는다.
- 카드 충돌 시 overlap 없이 주변 카드가 밀리고 세로로 압축된다.
- 드래그 종료 후 새로고침 없이 화면에 보인 전체 재배치 결과가 유지된다.
- wide/compact 전환 시 각 breakpoint의 독립 layout이 보존된다.
- 새 아이템이 각 breakpoint에서 첫 fitting rectangle에 생성된다.
- 저장 후 새로고침해도 재배치 결과가 유지된다.
- 드래그 중 포인터를 viewport 상단·하단 edge에 두면 페이지 또는 가장 가까운 scroll container가 자동으로 스크롤되고, edge를 벗어나거나 드래그를 종료하면 스크롤이 멈춘다.

이번 문서에서 정의하지 않은 drag intent threshold와 custom placeholder는 별도 후속 범위다.
