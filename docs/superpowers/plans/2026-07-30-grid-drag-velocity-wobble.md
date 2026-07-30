# 그리드 드래그 velocity wobble 구현 계획

## 목표

편집 모드에서 그리드 아이템을 드래그할 때 포인터의 이동 방향과 속도를 카드의 시각적 기울기에 반영한다. 기존 RGL의 위치 이동, 충돌 처리, placeholder, 전체 layout 저장은 변경하지 않는다.

## 구현 범위

1. `GridSection`의 RGL `onDrag` 이벤트에서 현재 포인터 속도를 계산한다.
2. 드래그 중인 아이템 내부 카드에 CSS custom property로 X/Y velocity를 전달한다.
3. 카드의 `rotateZ`와 `rotateX`를 velocity에 연결하고, 제한값과 transition으로 자연스러운 follow-through를 만든다.
4. 드래그 시작·종료·취소 시 velocity 값을 초기화한다.
5. `prefers-reduced-motion`에서는 기존처럼 transform 효과를 제거한다.

## 검증

- frontend Biome check
- frontend typecheck
- frontend build
- 브라우저에서 edit mode의 느린/빠른/방향 전환 드래그 시 카드 기울기와 복원이 보이는지 수동 확인
- read-only mode, interactive child drag cancel, RGL 충돌·placeholder·layout 저장 동작은 기존 계약을 유지하는지 확인

프론트엔드 테스트 파일은 추가하지 않는다.
