# 핸들 페이지 visitors Simple Analytics 구현 계획

## 구현 범위

- Simple Analytics CDN 스크립트로 교체
- 라우트 실제 경로 수동 페이지뷰 수집
- `page.id` 안정 경로 추가 수집
- Simple Analytics Stats API 기반 오늘·어제 visitors 조회
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
   - `start`, `end`, `timezone`, `pages`를 사용해 오늘·어제를 조회한다.
   - 응답을 Valibot으로 검증하고 15분 캐시한다.
4. `apps/frontend/src/routes/$handle.tsx`
   - 기존 visitors 화면과 핸들 페이지 안정 경로 수집을 Simple Analytics 모듈로 연결한다.
5. `apps/frontend/src/cloudflare-workers.d.ts`
   - 선택적 `SIMPLE_ANALYTICS_API_KEY` Worker secret 타입을 정의한다.

## 확인 명령

```sh
bunx biome check apps/frontend/src/routes/__root.tsx apps/frontend/src/lib/analytics/simple-analytics.ts apps/frontend/src/lib/api/visitors.functions.ts
bun run build
```

프론트엔드 자동 테스트는 프로젝트 규칙에 따라 추가하지 않는다. 실제 배포 확인은 브라우저 Network에서 Simple Analytics 수집 요청과 Stats API 응답을 확인한다.
