# 그리드 드래그 자동 스크롤 구현 계획

## 목표

RGL의 드래그 동작을 유지하면서 포인터가 화면 또는 현재 편집 scroll container의 수직 가장자리에 머무를 때 해당 영역을 자동 스크롤한다.

## 구현 범위

1. RGL `onDragStart`에서 드래그 대상의 가장 가까운 세로 scroll container를 찾는다.
2. `onDrag`에서 최신 pointer client 좌표를 저장한다.
3. 드래그 중 `requestAnimationFrame` loop로 edge region 진입 여부와 스크롤 속도를 계산하고, 스크롤 프레임마다 RGL의 `react-draggable` 위치 갱신 이벤트를 동기화한다.
4. `onDragStop` 및 unmount에서 animation frame과 상태를 정리한다.
5. RGL의 layout, collision, compaction, persistence 흐름은 변경하지 않는다.

## 검증

- frontend Biome check
- frontend typecheck
- frontend build
- 브라우저에서 edit mode 드래그 중 viewport 상단·하단 edge에 머물 때 자동 스크롤 확인
- edge에 포인터를 고정한 동안 스크롤과 드래그 아이템 위치가 함께 연속 갱신되는지 확인
- edge를 벗어나거나 드래그를 종료하면 자동 스크롤 정지 확인
- read-only mode와 interactive child drag cancel 동작 유지 확인

프론트엔드 테스트 파일은 추가하지 않는다.
