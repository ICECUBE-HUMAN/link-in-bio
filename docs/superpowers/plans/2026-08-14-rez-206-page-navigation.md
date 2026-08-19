# REZ-206 페이지 전환 UI 버그 구현 계획

## 구현

1. `apps/frontend/src/routes/$handle.tsx`에서 route loader의 핸들이 로컬
   페이지 상태와 다르면 loader 페이지를 우선 사용한다.
2. `HandlePageContent`에 현재 핸들을 `key`로 지정해 페이지 핸들 전환 때만
   화면 상태와 그리드 상태를 새로 시작한다.
3. 기존 설정 저장 시의 로컬 페이지 갱신과 URL 교체 동작은 유지한다.

## 검증

- Given 인증된 사용자가 두 페이지를 생성한 상태
- When 페이지 목록에서 primary와 일반 페이지를 차례로 선택
- Then 프로필 전환은 새 페이지 진입 효과를 사용하고 그리드는 첫 행에서 시작
- Evidence: 브라우저 URL, `main.page-scroll-container.scrollTop`,
  `#page-profile`/`#page-grid` 위치, 화면 캡처 또는 DOM 상태

정적 검증은 `bun run --filter @grabbin/frontend typecheck`,
`bunx biome check apps/frontend/src/routes/$handle.tsx`,
`bun run --filter @grabbin/frontend build`, `git diff --check`로 수행한다.
