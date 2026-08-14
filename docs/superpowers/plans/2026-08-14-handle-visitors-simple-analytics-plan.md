# 핸들 페이지 views Simple Analytics 구현 계획

## 구현 범위

- Simple Analytics CDN 스크립트로 교체
- 라우트 실제 경로 수동 페이지뷰 수집
- `page.id` 안정 경로 추가 수집
- Simple Analytics Stats API 기반 오늘·어제 pageviews 조회
- 페이지 소유자의 Pro 권한에 따른 views 기능 활성화
- 15분 서버 캐시와 실패 시 `null` 처리

## 파일별 작업

1. `apps/frontend/src/routes/__root.tsx`
   - Simple Analytics 스크립트를 `data-auto-collect=false`로 로드한다.
   - `useLocation` 변경 때 실제 pathname을 수집한다.
2. `apps/frontend/src/lib/analytics/simple-analytics.ts`
   - `sa_pageview` 타입과 로드 지연 재시도를 제공한다.
   - `page.id`를 안정 경로로 바꿔 추가 수집한다.
3. `apps/frontend/src/lib/api/visitors.functions.ts`
	- Simple Analytics Stats API를 호출한다.
	- `pageviews` 값을 조회한다.
   - `start`, `end`, `timezone`, `pages`를 사용해 오늘·어제를 조회한다.
   - 응답을 Valibot으로 검증하고 15분 캐시한다.
   - 페이지 핸들·ID와 `visitorsEnabled`를 다시 확인해 Free 페이지의 직접 조회를 막는다.
4. `apps/frontend/src/routes/$handle.tsx`
	- 기존 views 화면과 핸들 페이지 안정 경로 수집을 Simple Analytics 모듈로 연결한다.
	- `visitorsEnabled`가 true인 Pro 페이지에서만 조회와 스켈레톤을 표시한다.
5. `apps/backend/src/services/public-page.service.ts`와 `packages/api/src/index.ts`
   - 페이지 소유자의 `getPlanAccess().hasAccess`를 `visitorsEnabled`로 공개 응답에 전달한다.
6. `apps/frontend/src/cloudflare-workers.d.ts`
   - 선택적 `SIMPLE_ANALYTICS_API_KEY` Worker secret 타입을 정의한다.

## 확인 명령

```sh
bunx biome check apps/frontend/src/routes/__root.tsx apps/frontend/src/lib/analytics/simple-analytics.ts apps/frontend/src/lib/api/visitors.functions.ts
bun run build
```

프론트엔드 자동 테스트는 프로젝트 규칙에 따라 추가하지 않는다. 실제 배포 확인은 Free·Pro 페이지를 각각 열어 visitors 표시 여부와 브라우저 Network의 Simple Analytics 수집 요청을 확인한다.
