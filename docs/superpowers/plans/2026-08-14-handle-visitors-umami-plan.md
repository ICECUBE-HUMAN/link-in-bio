# 핸들 페이지 visitors Umami 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 핸들 페이지에서 `page.id` 기준으로 Umami visitors를 기록하고, 사용자 브라우저 시간대 기준의 오늘·어제 visitors를 화면에 표시한다.

**Architecture:** 기존 Umami 자동 추적은 실제 핸들 URL을 계속 기록한다. 핸들 페이지가 로드될 때 `page.id`를 포함한 안정적인 가상 경로의 페이지뷰를 한 번 더 기록하고, 서버 전용 TanStack Start 함수가 그 경로를 Umami `stats` API로 조회한다. 브라우저 시간대는 서버에 전달하며, 서버는 현지 자정 범위를 UTC 타임스탬프로 바꾼 뒤 15분 동안 결과를 캐시한다.

**Tech Stack:** TanStack Start, TanStack React Query, React, Valibot, Cloudflare Workers, Umami Cloud API, Web `Intl` API

## Global Constraints

- Umami 조회 기준은 핸들이 아니라 영구적인 `page.id`다.
- 오늘은 `[현지 자정, 다음 현지 자정)`이고 어제는 `[이전 현지 자정, 오늘 현지 자정)`이다.
- Umami API key는 서버에서만 사용한다.
- Umami 조회 결과의 캐시 기간은 15분이다.
- 화면 문구는 `{count} visitors today`, Tooltip 문구는 `{count} visitors yesterday`다.
- 통계는 기존 `PageManagementMenu` 또는 `MyPageButton` 바로 뒤에 표시한다.
- 소유자 방문은 집계하고 `/demo`는 집계·표시에서 제외한다.
- 작은 화면 UI 변경은 이번 작업에 포함하지 않는다.
- 프론트엔드 자동 테스트 파일은 추가하지 않고 설계 문서의 수동 QA 시나리오를 실행한다.
- 기존 `apps/frontend/src/routes/__root.tsx`의 사용자 변경을 덮어쓰거나 함께 커밋하지 않는다.
- 새 dependency를 추가하지 않는다. 시간대 계산은 Web `Intl` API를 사용한다.

---

## File Map

- Create: `apps/frontend/src/lib/api/visitors.functions.ts`
  - Umami stats 서버 함수, 시간대 범위 계산, 15분 캐시, React Query 옵션
- Create: `apps/frontend/src/lib/analytics/umami.ts`
  - `page.id` 기반 안정 경로 페이지뷰 기록과 Umami 전역 타입
- Modify: `apps/frontend/src/routes/$handle.tsx`
  - 안정 경로 추적 실행, 브라우저 시간대 조회, visitors 조회, 기존 컨트롤 뒤 UI 표시
- Modify: `apps/frontend/src/env.ts`
  - `UMAMI_API_KEY`, `UMAMI_WEBSITE_ID` 서버 환경 변수 정의
- Runtime only: `apps/frontend/.env.local` 또는 Wrangler secret/variable
  - 실제 Umami API key와 website ID 설정. 값은 저장소에 커밋하지 않는다.
- No change: `apps/frontend/src/routes/__root.tsx`
  - 이미 있는 Umami script 설정을 재사용한다.
- No change: `apps/backend/**`
  - 이번 기능은 프론트 Worker의 서버 함수에서 Umami를 조회하므로 백엔드와 데이터베이스를 수정하지 않는다.

## Interfaces

`apps/frontend/src/lib/api/visitors.functions.ts`는 다음 계약을 제공한다.

```ts
export type PublicVisitorsInput = {
	pageId: string;
	timezone: string;
};

export type PublicVisitors = {
	todayVisitors: number | null;
	yesterdayVisitors: number | null;
};

export const getPublicVisitors: (input: {
	data: PublicVisitorsInput;
}) => Promise<PublicVisitors>;

export function getPublicVisitorsQueryOptions(pageId: string, timezone: string);
```

`apps/frontend/src/lib/analytics/umami.ts`는 다음 계약을 제공한다.

```ts
export function trackPageIdPageView(pageId: string): () => void;
```

함수는 브라우저에서만 동작하고, 호출자가 `useEffect` 정리 단계에서 사용할 수 있도록 취소 함수를 반환한다.

---

### Task 1: Umami visitors 서버 조회 함수 만들기

**Files:**
- Create: `apps/frontend/src/lib/api/visitors.functions.ts`
- Modify: `apps/frontend/src/env.ts`

**Interfaces:**
- Consumes: `PublicVisitorsInput`의 `pageId`, `timezone`
- Produces: `PublicVisitors`와 `getPublicVisitorsQueryOptions`

- [ ] **Step 1: 서버 환경 변수 계약 추가**

`apps/frontend/src/env.ts`의 `server` 영역에 다음 두 값을 추가한다. 로컬에서 Umami 설정이 없더라도 앱 전체가 시작될 수 있도록 optional로 두고, 값이 없으면 조회 함수가 `null` 값을 반환한다.

```ts
server: {
	UMAMI_API_KEY: z.string().min(1).optional(),
	UMAMI_WEBSITE_ID: z.string().uuid().optional(),
},
```

`UMAMI_WEBSITE_ID`는 루트 script의 website ID와 같은 값이어야 한다. `UMAMI_API_KEY`는 `VITE_` 접두사를 사용하지 않는다.

- [ ] **Step 2: Umami stats 응답과 입력을 검증**

`visitors.functions.ts`에서 기존 `createServerFn`과 Valibot 사용 패턴을 따른다.

```ts
const publicVisitorsInputSchema = v.object({
	pageId: v.pipe(v.string(), v.uuid()),
	timezone: v.string(),
});

const umamiStatsResponseSchema = v.object({
	visitors: v.number(),
});
```

서버 함수는 `createServerFn({ method: "GET" })`와 `.validator(...)`를 사용한다. `pageId`가 UUID가 아니면 Umami API를 호출하지 않는다.

- [ ] **Step 3: IANA 시간대 기준 하루 범위 계산**

새 dependency 없이 `Intl.DateTimeFormat`으로 시간대를 검증하고 현지 날짜를 얻는다. `getLocalDayRange(timezone, now)` 내부에서 다음 순서로 계산한다.

1. `Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)`로 현지 연·월·일을 얻는다.
2. 현지 날짜의 자정을 UTC 후보로 만든다.
3. 후보 시각을 같은 시간대로 다시 포맷해 UTC 오프셋을 구한다.
4. 후보에서 오프셋을 보정하고, 다시 계산한 오프셋으로 한 번 더 보정한다.
5. 오늘 범위와 하루 전 범위를 `[start, end)` 형태의 밀리초 UTC 범위로 반환한다.

시간대가 유효하지 않으면 `UTC`로 한 번만 재시도한다. `23:59:59`를 만들지 않고 다음 자정을 제외 범위로 사용한다. 이 범위는 서머타임 지역의 23시간·25시간 하루도 고정된 24시간으로 잘못 줄이지 않는다.

- [ ] **Step 4: Umami stats 호출과 15분 캐시 구현**

Umami Cloud endpoint는 `https://api.umami.is/v1`로 고정하고, 요청에는 `x-umami-api-key`를 넣는다. 각 날짜 범위마다 다음 URL을 만든다.

```text
/websites/{UMAMI_WEBSITE_ID}/stats
  ?startAt={utcStartMilliseconds}
  &endAt={utcEndMilliseconds}
  &path=/__analytics/pages/{pageId}
```

오늘과 어제 요청은 `Promise.all`로 병렬 호출한다. 응답이 `2xx`가 아니거나 schema 검증에 실패하면 해당 값을 `null`로 만든다. Umami가 실패해도 서버 함수가 핸들 페이지 렌더링을 깨뜨리지 않도록 예외를 외부로 던지지 않는다.

캐시는 모듈 범위 `Map`에 다음 키로 저장한다.

```text
{pageId}:{timezone}:{localDate}:{today|yesterday}
```

TTL은 `900_000`ms다. 캐시 값은 `{ value: number | null, expiresAt: number }` 형태로 저장하고 만료된 값은 요청 전에 제거한다. 이 캐시는 Worker isolate 단위라는 한계가 있으며, 호출량이 커져 전역 공유 캐시가 필요해질 때 Cloudflare edge cache로 확장한다.

- [ ] **Step 5: React Query 옵션 제공**

다음 query key와 옵션을 사용한다.

```ts
queryKey: ["public-visitors", pageId, timezone]
staleTime: 900_000
queryFn: () => getPublicVisitors({ data: { pageId, timezone } })
```

`timezone`이 준비되기 전에는 호출하지 않도록 이 옵션을 사용하는 쪽에서 `enabled`를 제어한다.

- [ ] **Step 6: 정적 확인**

Run:

```bash
bunx biome check apps/frontend/src/lib/api/visitors.functions.ts apps/frontend/src/env.ts
git diff --check
```

Expected: 새 파일과 `env.ts`에 문법·형식 오류가 없고 whitespace 오류가 없다.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/api/visitors.functions.ts apps/frontend/src/env.ts
git commit -m "feat: add Umami visitors query"
```

---

### Task 2: `page.id` 안정 경로 페이지뷰 기록 추가

**Files:**
- Create: `apps/frontend/src/lib/analytics/umami.ts`
- Modify: `apps/frontend/src/routes/$handle.tsx`

**Interfaces:**
- Consumes: `page.id`와 기존 루트 Umami script의 `window.umami`
- Produces: Umami에 `/__analytics/pages/{page.id}` 경로로 기록되는 페이지뷰

- [ ] **Step 1: Umami 전역 타입과 추적 함수 정의**

`umami.ts`에 `window.umami` 타입을 선언하고 다음 경로를 만든다.

```ts
const pageAnalyticsPath = (pageId: string) =>
	`/__analytics/pages/${encodeURIComponent(pageId)}`;
```

`trackPageIdPageView(pageId)`는 `window`가 없는 SSR에서는 바로 no-op 정리 함수를 반환한다. 브라우저에서 Umami가 준비되어 있으면 다음처럼 기존 기본 속성을 보존하면서 URL만 덮어쓴다.

```ts
window.umami.track((props) => ({
	...props,
	url: pageAnalyticsPath(pageId),
}));
```

Umami가 아직 없으면 `load` 이벤트에 한 번 등록하고, 반환한 정리 함수가 이벤트 리스너를 제거하도록 한다. 렌더링을 기다리거나 반복 polling하지 않는다.

- [ ] **Step 2: 핸들 페이지에서 page ID마다 한 번 호출**

`HandlePageContent`에 `useRef<string | null>(null)`을 두고 다음 조건으로 호출한다.

```ts
useEffect(() => {
	if (loaderData.isDemo || trackedPageIdRef.current === page.id) return;
	trackedPageIdRef.current = page.id;
	return trackPageIdPageView(page.id);
}, [loaderData.isDemo, page.id]);
```

실제 브라우저 URL 자동 추적은 유지한다. `__root.tsx`의 `data-auto-track` 설정이나 기존 Umami script를 수정하지 않는다.

- [ ] **Step 3: 정적 확인**

Run:

```bash
bunx biome check apps/frontend/src/lib/analytics/umami.ts
git diff --check
```

Expected: 새 추적 함수가 형식 검사를 통과하고 기존 핸들 페이지의 unrelated diff가 생기지 않는다.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/lib/analytics/umami.ts apps/frontend/src/routes/\$handle.tsx
git commit -m "feat: attribute Umami views to page id"
```

---

### Task 3: 오늘 visitors와 어제 Tooltip 표시

**Files:**
- Modify: `apps/frontend/src/routes/$handle.tsx`

**Interfaces:**
- Consumes: `getPublicVisitorsQueryOptions(page.id, timezone)`와 `PublicVisitors`
- Produces: 기존 컨트롤 오른쪽의 `Today visitors` 텍스트와 `Yesterday visitors` Tooltip

- [ ] **Step 1: 브라우저 시간대 상태 추가**

핸들 페이지에서 SSR 중에는 시간대를 알 수 없으므로 다음 순서로 상태를 만든다.

```ts
const [timezone, setTimezone] = useState<string | null>(null);

useEffect(() => {
	setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
}, []);
```

시간대가 `null`인 동안에는 Umami 조회를 실행하지 않는다.

- [ ] **Step 2: visitors query 연결**

```ts
const visitorsQuery = useQuery({
	...getPublicVisitorsQueryOptions(page.id, timezone ?? "UTC"),
	enabled: !loaderData.isDemo && timezone !== null,
});
```

`page.id`와 `timezone`이 바뀌면 새 query key로 조회한다. `loaderData.isDemo`에서는 query가 실행되지 않는다.

- [ ] **Step 3: 기존 조건문 바로 뒤에 통계 표시**

다음 블록의 바로 뒤에 통계를 둔다.

```tsx
{isSignedIn ? (
	isCurrentUserPage ? (
		<PageManagementMenu triggerPage={{ ...page, ...draft }} />
	) : (
		<MyPageButton />
	)
) : null}
```

표시 규칙:

```tsx
{!loaderData.isDemo && !visitorsQuery.isError ? (
	<Tooltip>
		<TooltipTrigger
			render={
				<button type="button" aria-label="Today visitors">
					{`${visitorsQuery.data?.todayVisitors ?? "—"} visitors today`}
				</button>
			}
		/>
		<TooltipContent>
			{`${visitorsQuery.data?.yesterdayVisitors ?? "—"} visitors yesterday`}
		</TooltipContent>
	</Tooltip>
) : null}
```

기존 컨트롤 영역의 스타일과 간격을 재사용한다. `TooltipTrigger`는 버튼으로 만들어 마우스 hover와 키보드 focus를 모두 지원한다. 작은 화면의 별도 표시 위치는 추가하지 않는다.

- [ ] **Step 4: 정적 확인**

Run:

```bash
bunx biome check 'apps/frontend/src/routes/$handle.tsx'
git diff --check
```

Expected: 새 JSX에 오류가 없고 `Today visitors`·`Yesterday visitors` 문구가 정확히 유지된다. 기존 파일에 이미 있던 형식 오류가 있으면 새 변경으로 생긴 오류와 구분해 기록한다.

- [ ] **Step 5: Commit**

```bash
git add 'apps/frontend/src/routes/$handle.tsx'
git commit -m "feat: show public visitors on handle pages"
```

---

### Task 4: 런타임 설정과 수동 검증

**Files:**
- Runtime only: `apps/frontend/.env.local` 또는 Wrangler 환경 설정
- Read: `docs/superpowers/specs/2026-08-14-handle-visitors-umami-design.md`
- No tracked secret file

**Interfaces:**
- Consumes: `UMAMI_API_KEY`, `UMAMI_WEBSITE_ID`
- Produces: 로컬·배포 환경에서 실제 Umami visitors 조회

- [ ] **Step 1: 로컬 환경 변수 설정**

저장소에 커밋되지 않는 로컬 환경에 다음 값을 설정한다.

```text
UMAMI_API_KEY=<Umami Cloud API key>
UMAMI_WEBSITE_ID=fd3c009c-be6e-4bb0-bf1f-054a8c713b35
```

API key는 메시지, 로그, 브라우저 Network에 출력하지 않는다.

- [ ] **Step 2: 프로덕션 Worker secret 설정**

프론트 Worker 배포 전에 다음 명령으로 secret을 설정한다.

```bash
cd apps/frontend
wrangler secret put UMAMI_API_KEY
wrangler secret put UMAMI_WEBSITE_ID
```

`UMAMI_WEBSITE_ID`는 secret으로도 동작하지만 공개 값이므로 별도 Worker variable로 관리해도 된다. 두 값은 루트 script와 Umami Cloud website가 가리키는 대상과 일치해야 한다.

- [ ] **Step 3: 빌드와 기본 확인**

Run:

```bash
bun run --cwd apps/frontend build
git diff --check
git status --short
```

Expected: 프론트 빌드가 성공하고, 기존 `apps/frontend/src/routes/__root.tsx` 변경을 제외한 의도하지 않은 파일이 생기지 않는다. 현재 저장소의 `tsconfig.json`은 최신 TypeScript에서 제거된 `baseUrl` 옵션을 사용하므로 `bun run --cwd apps/frontend typecheck`가 그 오류로 중단되면 기존 환경 문제로 기록하고 이 기능의 오류로 판정하지 않는다.

- [ ] **Step 4: 설계 문서의 수동 QA 실행**

다음 시나리오를 이름을 바꾸지 않고 실행한다.

- `VISITORS-001`: page ID 기준 추적
- `VISITORS-002`: 핸들 변경 뒤 통계 유지
- `VISITORS-003`: 오늘·어제 시간대 경계
- `VISITORS-004`: 표시와 Tooltip
- `VISITORS-005`: 실패 처리와 보안
- `VISITORS-006`: 캐시

각 시나리오에 Given·When·Then·Evidence와 `Pass`, `Fail`, `Blocked`, `Not Run` 결과를 기록한다. 실패 또는 차단 시 재현 절차와 실제 증거를 함께 남긴다.

- [ ] **Step 5: Commit verification evidence**

```bash
git add docs/qa/2026-08-14-handle-visitors-umami-qa.md
git commit -m "docs: record Umami visitors QA"
```

QA 문서는 사용자가 별도로 요청하거나 구현 완료 시점에 설계 문서 기준으로 작성한다. 부모 Linear 이슈가 확인되면 해당 부모 이슈 Resources와 comment에 설계·계획·QA 범위를 연결한다.

---

## Final Verification

- [ ] `page.id`가 다른 핸들에서도 같은 Umami analytics path로 기록된다.
- [ ] 오늘·어제 범위가 브라우저 IANA 시간대의 자정 기준이다.
- [ ] `Today visitors`만 화면에 보이고 `Yesterday visitors`는 Tooltip에만 보인다.
- [ ] 소유자 방문은 집계되고 `/demo`는 제외된다.
- [ ] Umami API key가 브라우저에 노출되지 않는다.
- [ ] Umami 오류가 핸들 페이지 표시를 막지 않는다.
- [ ] 15분 캐시가 적용된다.
- [ ] 모바일 UI는 변경하지 않는다.
- [ ] 설계 문서의 여섯 수동 QA 시나리오가 기록된다.
