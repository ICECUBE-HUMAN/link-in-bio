# demo 페이지 설계

## 목적

`/demo`를 제품의 공개·편집 페이지를 직접 체험할 수 있는 데모로 제공한다.
데모는 일반 `$handle` 페이지와 같은 레이아웃, grid 편집, breakpoint 전환, 링크,
미디어, 지도, 섹션, 프로필 편집 UI를 사용한다. 초기 데이터는 `PageByHandleResponse`
형태의 데모 fixture에서 읽고, 페이지·아이템·미디어·메타데이터 변경은 backend, DB, R2,
인증 API에 저장하지 않는다.

## 요구사항

- `demo`는 예약어로 유지되어 일반 사용자가 생성하거나 변경할 수 없어야 한다.
- `/demo`는 별도 정적 라우트와 `apps/frontend/src/lib/demo/demo-page.functions.ts`의 정적
  fixture로 빌드한다. fixture는 `/tester`의 현재 데이터를 복사한 시작점이며 운영 중에는
  실제 계정이나 backend 응답에 의존하지 않는다.
- 데모에서는 편집 모드를 활성화한다. 제목, 소개, 프로필 이미지/크롭, item 추가·삭제·편집·이동,
  preset, breakpoint, 링크 추가, 미디어 선택을 현재 브라우저 상태에서만 반영한다.
- 데모 경로에서 page autosave, item batch PATCH, link metadata enrichment, media upload,
  profile image upload/crop PATCH, handle PATCH, logout/delete 같은 외부 변경 호출을 하지 않는다.
- 일반 사용자 페이지의 조회·저장 동작과 API 계약은 변경하지 않는다.

## 설계

### 로컬 데이터 경계

`apps/frontend/src/lib/demo/demo-page.functions.ts`의 `getDemoPage`는 정적
`PageByHandleResponse` fixture의 새 복사본을 반환한다. `/demo` 전용 라우트는 이 데이터를
사용하며 정적 HTML로 prerender된다. 일반 handle은 기존 동적 query/API 흐름을 그대로 사용한다.
`packages/api/src/index.ts`의 `reservedPageHandles`에는 이미 `demo`가 포함되어 있는지 확인하고
유지한다.

### 저장 경계

- `usePageAutoSave`는 `persist` 옵션을 추가해 draft/dirty 상태는 유지하되 demo에서는 mutation을
  실행하지 않는다.
- `useGridEditorStore`의 기존 `persistItems: false`를 demo에 연결한다.
- `useLinkMetadataEnrichment`는 demo에서 no-op으로 실행해 새 link도 seed의 초기 metadata와 함께
  로컬에 남긴다.
- `PageImageEditor`는 `localOnly`일 때 object URL과 crop만 사용하며 upload/PATCH를 건너뛴다.
- toolbar media 선택은 local preview item만 추가하고 upload endpoint를 건너뛴다.
- `PageSettingsMenu`는 demo에서 handle 변경을 local page state에만 반영하고 계정 변경 동작은
  노출하지 않는다.

### 상호작용

데모는 `isCurrentUserPage: true`로 같은 edit mode와 toolbar를 사용한다. 데모에서는 세션
query cache를 편집 권한 판단에 사용하지 않는다. `isDemo` 플래그는 라우트 loader data에서
내려 각 저장 경계에만 전달하고, 렌더링 컴포넌트의 공개 UI 구조는 일반 페이지와 공유한다.
로컬 변경은 query cache와 컴포넌트 state를 업데이트할 수 있지만 network mutation은 발생하지
않는다.

## Verification scenarios

### DEMO-01: 실제 source 데이터와 타입

- Given: 인증되지 않은 사용자가 `/demo`에 접근한다.
- When: 페이지가 초기 렌더링된다.
- Then: fixture의 profile/grid가 표시되고 backend 페이지 조회 없이 아이템이 존재한다.
- Evidence: browser 화면, network 요청 목록, DOM의 `data-grid-item-type` 분포.

### DEMO-02: 편집 기능

- Given: `/demo`가 edit mode로 열린다.
- When: text/section/link/map/media 추가, item 이동·삭제·preset·breakpoint, profile text 수정,
  이미지 선택·crop을 수행한다.
- Then: 변경이 현재 화면에 반영되고 새로고침 전까지 유지되며 저장 endpoint는 호출되지 않는다.
- Evidence: 화면 상태, network 요청 목록, console error 부재.

### DEMO-03: 예약어 보호

- Given: 사용자가 `demo` 또는 대소문자 변형 handle을 생성/변경하려 한다.
- When: handle availability/API validation을 수행한다.
- Then: reserved 결과로 거절된다.
- Evidence: `reservedPageHandles`, backend availability 응답과 기존 테스트.

### DEMO-04: 일반 페이지 회귀

- Given: 일반 handle 페이지에 접근한다.
- When: 기존 편집 또는 공개 흐름을 사용한다.
- Then: demo 분기 없이 기존 조회·저장 경계가 동작한다.
- Evidence: frontend typecheck/check/build 및 diff 검토.
