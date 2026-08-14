# 핸들 페이지 visitors 통계 설계

## 1. 목표

공개 핸들 페이지에서 해당 페이지의 visitors 수를 Umami로 추적하고, 사용자 브라우저 시간대 기준의 오늘 visitors를 화면에 표시한다. 어제 visitors는 Tooltip으로 제공한다.

핸들이 바뀌어도 같은 페이지의 통계가 이어져야 하므로, URL의 핸들이 아니라 영구적인 `page.id`를 Umami 조회 기준으로 사용한다.

## 2. 확정 요구사항

- 대상 화면은 `apps/frontend/src/routes/$handle.tsx`의 공개 핸들 페이지다.
- 화면에는 `0 visitors today` 형식으로 오늘 visitors만 표시한다.
- Tooltip에는 `0 visitors yesterday` 형식으로 어제 visitors를 표시한다.
- 통계 컨트롤은 기존 `PageManagementMenu` 또는 `MyPageButton` 바로 뒤에 둔다.
- 소유자가 자신의 페이지를 보거나 편집할 때의 방문도 집계한다.
- `/demo` 페이지는 집계하지 않고 통계도 표시하지 않는다.
- 오늘과 어제의 경계는 방문자 브라우저의 IANA 시간대 기준 자정이다.
- 서버는 해당 현지 시간 범위를 UTC `startAt`·`endAt`으로 변환해 Umami API에 전달한다.
- Umami API 응답은 최대 15분 동안 캐시한다.
- Umami API 키는 서버에서만 사용하며 브라우저에 노출하지 않는다.
- 작은 화면의 통계 표시 방식은 이번 범위에서 제외한다.
- 프론트엔드 자동 테스트는 추가하지 않고 수동 검증으로 확인한다.

## 3. 범위와 제외 사항

### 포함

- `page.id`를 안정적인 Umami 페이지 경로로 기록
- 오늘·어제 visitors 조회용 TanStack Start 서버 함수
- 브라우저 시간대 전달과 현지 자정 범위 계산
- Umami Cloud API 연동과 서버 환경 변수
- 15분 캐시
- 기존 컨트롤 영역의 오늘 visitors 표시와 어제 visitors Tooltip
- Umami 장애 시 핸들 페이지를 계속 사용할 수 있는 실패 처리

### 제외

- 자체 analytics 데이터베이스나 별도 방문자 저장소
- 페이지별 Umami website 생성
- 공개 통계의 모바일 UI 재설계
- 기간 선택, 차트, 누적 visitors, 페이지뷰 수 표시
- Umami의 기존 URL 기반 일반 통계 변경

## 4. Umami 기록 방식

현재 루트 문서의 Umami 자동 추적은 실제 브라우저 URL인 `/{handle}`을 계속 기록한다. 여기에 핸들 페이지가 로드될 때 안정적인 가상 경로로 페이지뷰를 한 번 더 기록한다.

```text
/__analytics/pages/{page.id}
```

브라우저 주소는 바꾸지 않는다. Umami tracker의 사용자 지정 페이지뷰 payload에서 `url`만 이 경로로 덮어쓴다. `page.id`가 바뀔 때만 한 번 기록하고, React 재렌더링으로 중복 기록하지 않는다. Umami tracker는 현재 페이지뷰 payload의 URL을 직접 지정할 수 있다.

이 추가 기록은 페이지 ID별 visitors 조회용이다. 기존 실제 URL 기록과 합쳐서 일반 페이지뷰 수를 표시하지 않는다.

Umami tracker가 아직 준비되지 않은 경우에는 페이지 렌더링을 막지 않고, 브라우저 `load` 시점에 한 번 재시도한다. `/demo`에서는 이 동작을 실행하지 않는다.

참고: [Umami Tracker Functions](https://docs.umami.is/docs/tracker-functions)

## 5. 데이터 조회 구조

### 브라우저

핸들 페이지는 다음 값을 서버 함수에 전달한다.

```ts
{
  pageId: string;
  timezone: string;
}
```

시간대는 `Intl.DateTimeFormat().resolvedOptions().timeZone`으로 얻는다. 서버 렌더링 중에는 기본값을 사용하고, 브라우저 시간대를 확인한 뒤 조회를 시작한다.

### 서버 함수

TanStack Start의 서버 함수가 Umami Cloud API를 호출한다. 함수는 다음을 수행한다.

1. `pageId`가 UUID인지 확인한다.
2. 시간대를 `Intl.DateTimeFormat`으로 확인한다. 잘못된 값은 `UTC`로 처리한다.
3. 해당 시간대 기준 오늘 자정과 내일 자정을 계산한다.
4. 오늘 범위를 UTC `startAt`·`endAt`으로 변환한다.
5. 어제 범위를 UTC `startAt`·`endAt`으로 변환한다.
6. Umami website ID와 `path=/__analytics/pages/{page.id}` 필터를 사용해 `stats` API를 각각 호출한다.
7. 두 응답의 `visitors`를 반환한다.

오늘 범위는 `[오늘 현지 자정, 내일 현지 자정)`이고, 어제 범위는 `[어제 현지 자정, 오늘 현지 자정)`이다. `23:59:59`를 직접 만들지 않아 밀리초 경계와 서머타임의 23시간·25시간 하루를 안전하게 처리한다.

응답 형태는 다음과 같다.

```ts
{
  todayVisitors: number | null;
  yesterdayVisitors: number | null;
}
```

`null`은 Umami 조회 실패 또는 아직 조회하지 않은 상태를 나타내며, 실제 visitors `0`과 구분한다.

Umami Cloud API는 `https://api.umami.is/v1`를 사용하고 `x-umami-api-key` 헤더로 인증한다. `UMAMI_API_KEY`와 `UMAMI_WEBSITE_ID`는 서버 전용 환경 변수로 둔다. `UMAMI_WEBSITE_ID`는 루트 script의 website ID와 같은 값이어야 한다. Umami API의 stats 응답은 `visitors`를 제공하고 `path` 필터를 지원한다.

참고: [Umami Cloud API Key](https://docs.umami.is/docs/cloud/api-key), [Umami Website Statistics](https://docs.umami.is/docs/api/website-stats)

## 6. 캐시

서버에서 Umami 응답을 15분 캐시한다. 캐시 키는 다음 값으로 구성한다.

```text
pageId + timezone + localDate + metric
```

오늘과 어제는 각각 별도 범위이므로 오늘 값이 갱신되어도 어제 값의 캐시를 불필요하게 무효화하지 않는다. 브라우저의 조회 상태도 15분 동안 재사용해 같은 페이지에서 반복 요청을 줄인다.

캐시는 visitors 통계만 대상으로 하며 페이지 콘텐츠, 권한, 편집 데이터에는 사용하지 않는다.

## 7. 화면 설계

기존 `$handle.tsx`의 컨트롤 영역에서 다음 조건문 바로 뒤에 통계를 둔다.

```tsx
{isSignedIn ? (
	isCurrentUserPage ? (
		<PageManagementMenu triggerPage={{ ...page, ...draft }} />
	) : (
		<MyPageButton />
	)
) : null}
```

통계 영역은 기존 `Tooltip` 컴포넌트를 재사용한다.

- 기본 표시: `{todayVisitors} visitors today`
- Tooltip 표시: `{yesterdayVisitors} visitors yesterday`
- 로딩 중: `— visitors today`
- 조회 실패: 통계 영역 숨김
- Tooltip은 마우스뿐 아니라 키보드 포커스로도 열 수 있어야 한다.
- 모바일 배치와 노출 방식은 이번 설계에서 정하지 않는다.

## 8. 오류와 안전

- Umami API 실패는 핸들 페이지 실패로 전파하지 않는다.
- API key, Umami API 응답 원문, 내부 오류 세부 내용은 브라우저에 반환하지 않는다.
- 잘못된 `pageId` 또는 시간대 입력은 안전한 오류 응답 또는 `UTC` 처리로 제한한다.
- 실제 페이지가 존재하지 않거나 `/demo`인 경우 통계 조회를 실행하지 않는다.
- Umami API 호출은 서버에서만 수행한다.
- 공개 stats 함수는 인증을 요구하지 않지만, 입력 검증과 15분 캐시로 반복 조회를 줄인다.

## 9. 구현 경계

예상 변경 범위는 다음과 같다.

- `apps/frontend/src/routes/$handle.tsx`
  - `page.id` 기반 Umami 추가 페이지뷰 기록
  - 브라우저 시간대 확인
  - visitors 조회와 컨트롤 영역 표시
- `apps/frontend/src/lib/api/visitors.functions.ts`
  - Umami stats 서버 함수와 응답 검증
- `apps/frontend/src/env.ts`
  - Umami 서버 환경 변수 정의
- `apps/frontend/src/routes/__root.tsx`
  - 기존 Umami script 설정을 재사용하며, 이 기능에서 자동 추적 동작을 바꾸지 않는다.

백엔드 API나 데이터베이스는 변경하지 않는다.

## 10. 수동 검증 시나리오

### VISITORS-001: page ID 기준 추적

- Given: 실제 페이지 `page.id`와 핸들이 존재한다.
- When: 핸들 페이지를 열고 Umami 수집 요청을 확인한다.
- Then: 실제 URL 기록과 함께 `/__analytics/pages/{page.id}` 경로의 추가 기록이 한 번 생성된다.
- Evidence: 브라우저 Network 요청, Umami 이벤트 또는 stats 응답.

### VISITORS-002: 핸들 변경 뒤 통계 유지

- Given: 같은 `page.id`에 기존 핸들과 새 핸들이 순서대로 연결된다.
- When: 두 핸들 페이지를 각각 방문한다.
- Then: 두 방문이 같은 stable analytics path로 조회된다.
- Evidence: 두 페이지의 Network 요청 경로와 Umami stats 결과.

### VISITORS-003: 오늘·어제 시간대 경계

- Given: 브라우저 시간대가 `Asia/Seoul` 또는 다른 IANA 시간대다.
- When: 현지 자정 전후에 오늘·어제 visitors를 조회한다.
- Then: 현지 자정 기준으로만 날짜가 바뀌고, 변환된 UTC 범위가 Umami API에 전달된다.
- Evidence: 서버 로그 또는 테스트용 API 요청 범위와 화면 값.

### VISITORS-004: 표시와 Tooltip

- Given: 오늘 visitors가 0이고 어제 visitors가 34다.
- When: 기존 `PageManagementMenu` 또는 `MyPageButton` 뒤의 통계에 포커스를 둔다.
- Then: 화면에 `0 visitors today`, Tooltip에 `34 visitors yesterday`가 표시된다.
- Evidence: 데스크톱 브라우저 화면과 키보드 포커스 동작.

### VISITORS-005: 실패 처리와 보안

- Given: Umami API가 오류를 반환하거나 응답이 지연된다.
- When: 핸들 페이지를 연다.
- Then: 페이지 콘텐츠와 기존 컨트롤은 정상 작동하고 통계 영역만 숨겨진다. API key는 브라우저 요청에 없다.
- Evidence: 브라우저 화면, Network 요청, 서버 로그.

### VISITORS-006: 캐시

- Given: 같은 `pageId`, 시간대, 날짜로 15분 안에 여러 번 조회한다.
- When: 같은 통계를 다시 요청한다.
- Then: Umami API를 매번 호출하지 않고 캐시된 값을 사용한다.
- Evidence: Umami API 호출 횟수 또는 서버 캐시 로그.

## 11. 완료 기준

- 위 수동 검증 시나리오가 모두 실행 가능하다.
- 핸들 변경에도 동일한 `page.id` 통계가 이어진다.
- `Today visitors`와 Tooltip의 `Yesterday visitors`가 사용자 시간대 기준으로 맞다.
- 15분 캐시가 적용된다.
- Umami API key가 서버 밖으로 노출되지 않는다.
- `/demo`가 통계에 포함되지 않는다.
- 모바일 UI 변경은 포함하지 않는다.
