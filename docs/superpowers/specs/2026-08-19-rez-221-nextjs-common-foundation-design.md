# REZ-221 Next.js 공통 문서와 화면 뼈대 이관 설계

## 목적

`apps/v2`에서 이후 이관되는 화면이 기존 앱과 같은 공통 스타일·문서 기본값·상태 화면을 사용할 수 있도록 Next.js 공통 기반을 마련한다. 공개 경로, 로그인, 페이지 편집, 백엔드 통신은 이 작업에 포함하지 않는다.

## 범위

- 기존 전역 CSS 본문은 옮기지 않고, 필요한 import만 `apps/v2` 전역 스타일에 반영한다.
- Next.js 루트 레이아웃에 HTML/body/main 구조와 기본 메타데이터·아이콘·매니페스트 링크를 둔다.
- 기존 `apps/frontend/public`의 아이콘·매니페스트 자산을 V2 `public`에서 재사용한다.
- 툴팁과 알림을 V2 공통 제공자로 제공한다.
- Next.js의 없는 페이지와 오류 화면을 추가한다.
- Simple Analytics 스크립트는 자동 수집을 끄고, `grabbin.me` 호스트에서만 경로 조회를 수동 기록한다.
- 기존 `apps/frontend`의 공통 코드와 동작은 삭제하거나 수정하지 않는다.

## 제외

- 공개 경로 이관과 `/\$handle` 전용 화면
- 로그인·세션·페이지 편집·API·데이터베이스
- `v2.grabbin.me`와 로컬 개발 환경의 Simple Analytics 기록
- 새로운 분석 저장소나 이벤트 체계
- 프론트엔드 자동 테스트

## 현재 상태와 제약

- `apps/v2/app/layout.tsx`와 `apps/v2/app/globals.css`는 Next.js 초기 화면용 최소 파일만 가진다.
- 기존 루트는 `apps/frontend/src/routes/__root.tsx`, `apps/frontend/src/styles.css`, `apps/frontend/src/lib/analytics/simple-analytics.ts`, 상태 화면 컴포넌트를 공통 기반으로 사용한다.
- 현재 워크트리에는 이 작업과 무관한 변경이 있으므로 해당 파일을 덮어쓰거나 되돌리지 않는다.
- `v2.grabbin.me`는 배포 확인용 호스트이며 실제 공개 전환 전에는 분석 수치를 만들지 않는다.

## 설계

### 1. 전역 스타일과 글꼴

`apps/v2/app/globals.css`의 현재 본문과 토큰은 그대로 유지한다. 기존 `apps/frontend/src/styles.css`에서 필요한 import 줄만 확인해 V2에 반영한다. `styles.css`의 토큰·애니메이션·유틸리티·선택자 본문은 복사하지 않는다. 별도 CSS 파일의 내용을 새로 복사하는 작업도 이 이슈에 포함하지 않는다.

### 2. 루트 레이아웃과 메타데이터

`app/layout.tsx`가 다음을 담당한다.

- `lang="en"`, 전체 높이 HTML/body 구조, 화면을 담는 `main` 구조
- 기본 제목과 설명
- viewport와 theme-color
- favicon, Apple touch icon, manifest 링크
- 이후 화면이 별도 제공자를 만들지 않아도 되는 공통 Provider 래퍼

페이지별 SEO와 canonical·OG·JSON-LD는 각 공개 경로 이관 이슈에서 추가한다. 이 작업에서는 공통 기본값만 둔다.

### 3. 공통 Provider

클라이언트 컴포넌트 하나에서 Tooltip Provider와 Sonner Toaster를 제공한다. 기본 알림 위치와 아이콘 스타일은 기존 앱을 따른다. 별도의 테마 전환 기능은 추가하지 않는다.

### 4. 상태 화면

- `not-found.tsx`: V2 어느 경로에서도 쓸 수 있는 일반 404 화면과 홈 이동을 제공한다.
- `error.tsx`: 오류 안내, 개발 환경 오류 메시지 표시, 다시 시도, 홈 이동을 제공한다.

핸들 미점유 문구나 로그인 이동처럼 기존 `/$handle`에 묶인 동작은 공개 핸들 이관 이슈에서 처리한다.

### 5. Simple Analytics

기존처럼 자동 수집은 끄고 `sa_pageview`를 사용한다. 클라이언트 경로 추적기는 Next.js의 `usePathname`을 사용한다. 다음 조건을 모두 만족할 때만 기록한다.

1. 브라우저에서 실행 중이다.
2. 현재 호스트가 정확히 `grabbin.me`다.
3. 분석 스크립트가 준비되어 있다.

로컬과 `v2.grabbin.me`에서는 스크립트가 페이지 조회를 기록하지 않는다. 중복 이벤트를 막기 위해 경로가 바뀔 때만 한 번 호출한다.

## 오류 처리

- 분석 스크립트가 늦게 로드되거나 없으면 화면 렌더링을 막지 않는다.
- `sa_pageview`가 없는 경우 한 번의 `load` 재시도만 등록하고, 컴포넌트가 사라질 때 제거한다.
- 상태 화면 자체에서 발생한 오류는 브라우저 기본 동작에 의존하지 않고 사용자가 홈으로 돌아가거나 다시 시도할 수 있게 한다.

## 파일 경계

예상 변경 파일은 다음으로 한정한다.

- `apps/v2/app/layout.tsx`
- `apps/v2/app/globals.css` (기존 본문 유지, 필요한 import만 추가)
- `apps/v2/app/not-found.tsx`
- `apps/v2/app/error.tsx`
- `apps/v2/public/favicon.svg`, `apps/v2/public/apple-touch-icon.png`, `apps/v2/public/manifest.json`, `apps/v2/public/logo192.png`, `apps/v2/public/logo512.png`
- `apps/v2/components/providers.tsx` 또는 같은 역할의 단일 Provider 파일
- `apps/v2/components/ui/tooltip.tsx`
- `apps/v2/components/ui/sonner.tsx`
- 필요한 경우 `apps/v2/package.json`의 이미 사용 중인 글꼴·알림 의존성 선언

기존 `apps/frontend` 파일은 참고만 하며 수정하지 않는다.

## 검증 기준

- `bun run check:v2`가 성공한다.
- `bun run build:v2`가 성공한다.
- 로컬 V2 `/`가 200 응답과 전역 스타일을 반환한다.
- 로컬과 `https://v2.grabbin.me/`에서 404와 오류 상태 화면을 확인할 수 있다.
- `grabbin.me`에서만 `sa_pageview` 호출이 발생하고, 로컬·`v2.grabbin.me`에서는 호출되지 않는다.
- 기존 `apps/frontend`의 변경 파일과 배포 설정에는 diff가 없다.

## 되돌리기

V2 배포를 되돌릴 때는 V2의 새 공통 파일만 이전 커밋으로 되돌린다. 기존 앱은 이 작업에서 수정하지 않으므로 별도 복구가 필요 없다.
