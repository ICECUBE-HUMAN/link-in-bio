# 핸들 페이지 visitors Simple Analytics 설계

## 목표

공개 핸들 페이지의 오늘·어제 visitors를 Simple Analytics에서 조회해 표시한다. 분석 원본 데이터는 Grabbin 데이터베이스에 저장하지 않는다.

## 확정 요구사항

- 분석 수집기는 Simple Analytics CDN을 사용한다.
- 일반 페이지는 실제 브라우저 경로로 수집한다.
- 핸들 페이지는 `page.id` 기반 `/__analytics/pages/{page.id}` 경로도 한 번 수집한다.
- visitors 조회는 Simple Analytics Stats API의 `fields=visitors`와 `pages` 필터를 사용한다.
- 날짜는 브라우저 시간대의 오늘·어제로 계산해 `start`, `end`, `timezone`으로 전달한다.
- 조회 결과는 서버에서 15분 캐시한다.
- API 키가 설정된 경우 서버 요청의 `Api-Key` 헤더로만 사용한다.
- 페이지 소유자가 Pro 권한을 가진 경우에만 visitors 기능을 활성화한다.
- Free 페이지는 visitors 문구와 로딩 스켈레톤을 모두 표시하지 않는다.
- Simple Analytics 장애나 응답 검증 실패는 핸들 페이지를 깨뜨리지 않고 통계만 숨긴다.

## 구조

1. 루트 문서가 Simple Analytics 스크립트를 `data-auto-collect=false`로 로드한다.
2. 루트의 클라이언트 추적기가 라우트의 실제 `pathname`을 `sa_pageview`로 기록한다.
3. 핸들 페이지는 추가로 영구적인 `page.id` 경로를 기록한다.
4. 서버 함수가 `https://simpleanalytics.com/{hostname}.json`을 호출한다.
5. 서버가 페이지 소유자의 `getPlanAccess().hasAccess`를 확인한다.
6. Pro 페이지에서만 응답의 `visitors`를 검증하고 오늘·어제 값을 화면과 Tooltip에 전달한다.

## 환경 변수

- `VITE_APP_DOMAIN`: Simple Analytics website hostname. 현재 배포값은 `grabbin.me`다.
- `SIMPLE_ANALYTICS_API_KEY`: 비공개 Stats API 조회가 필요한 경우에만 프론트 Worker secret으로 설정한다.

## 제외

- 별도 분석 데이터베이스
- 백엔드 Worker 또는 PostgreSQL 스키마 변경
- Simple Analytics 원본 이벤트를 Grabbin에 복제

## 검증 기준

- [ ] 브라우저 Network에 Simple Analytics 수집 요청이 보이고 이전 수집기 요청은 없다.
- [ ] 일반 라우트 이동마다 실제 pathname 페이지뷰가 한 번 기록된다.
- [ ] 핸들 페이지에서 `page.id` 안정 경로 페이지뷰가 한 번 추가된다.
- [ ] 오늘·어제 값이 브라우저 시간대 기준으로 조회된다.
- [ ] API 오류 시 페이지 본문과 기존 컨트롤은 정상 동작한다.
- [ ] Free 페이지는 visitors 기능을 표시하거나 조회하지 않는다.
- [ ] Pro 페이지는 초기 조회 중 스켈레톤을 표시하고 조회 후 숫자를 표시한다.
- [ ] API 키가 브라우저 응답이나 요청에 노출되지 않는다.
