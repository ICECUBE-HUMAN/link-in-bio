# REZ-206 페이지 전환 UI 버그 설계

## 문제

페이지 목록에서 같은 `/$handle` 라우트의 핸들만 바꾸면 `HandlePageContent`와
`GridSection`이 유지된다. 이때 `GridSection`의 이전 아이템 목록과 새 페이지
아이템 목록이 비교되어 새 페이지의 모든 아이템이 새 아이템으로 오인된다.
아이템 진입 처리의 `scrollIntoView({ block: "nearest" })`가 여러 번 실행되어
그리드가 중간 행으로 이동한다. 이전 페이지의 Motion 레이아웃과 프로필 표시
상태도 남아 페이지 전환 위치와 애니메이션이 튄다.

## 설계

`loaderData.page.handle`과 로컬 페이지 상태가 다를 때는 새 loader 페이지를
즉시 화면에 사용하고, `HandlePageContent`에 현재 핸들을 React key로 준다.
핸들이 바뀌면 페이지 화면과 `GridSection`을 함께 새로 마운트하여 초기 아이템을
진입 아이템으로 처리하지 않게 하고, 이전 Motion 레이아웃·스크롤·프로필 상태를
재사용하지 않는다. 같은 핸들에서 설정을 저장하는 로컬 페이지 갱신은 기존
상태를 유지한다.

## 범위

- `apps/frontend/src/routes/$handle.tsx`만 수정한다.
- API, 저장 로직, `GridSection`의 아이템 진입 동작, 페이지 목록 UI는 변경하지 않는다.
- 프론트엔드 테스트는 추가하지 않는다.

## 검증 기준

- 페이지 목록에서 primary → 일반 페이지로 이동하면 프로필이 이전 레이아웃에서
  내려오지 않고 새 페이지의 프로필 진입 효과가 실행된다.
- 일반 → primary 페이지로 이동하면 그리드가 맨 위에서 시작하고 중간 행으로
  자동 이동하지 않는다.
- 같은 페이지에서 설정 변경 후 화면이 불필요하게 초기화되지 않는다.
- `typecheck`, Biome 검사, `build`, `git diff --check`가 통과한다.
