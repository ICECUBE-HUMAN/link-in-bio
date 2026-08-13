# REZ-172 CPU 제한 수정 수동 QA

## 목적

전역 인증 세션 조회를 줄인 백엔드 배포본에서 로그인 페이지, 프로필 이미지 크롭, 로그아웃 공개 페이지가 정상 동작하고 CPU 제한이 다시 발생하지 않는지 확인한다.

## 환경

- 대상: `https://grabbin.me/founder`
- 백엔드 Worker: `grabbin-api`
- 초기 확인 배포 버전: `f6ef34ef-a4fb-432c-90c0-9317e5042acf`
- 최신 CPU 개선 배포 버전: `ed1176dc-3998-4a2d-b0f2-593cd5340df4`
- 최종 Seoul 배치 배포 버전: `a279eabe-2ae7-4c62-8ec1-56b21b0f6740`
- 확인 방법: 인앱 브라우저 + `wrangler tail --format json`
- 결과 기준: `outcome=ok`, HTTP 응답, 브라우저 오류, CPU 초과 여부

## 테스트 결과

### QA-172-01 로그인 상태 페이지 조회

- 결과: **Pass**
- Given: 로그인 상태이고 `/founder`에 접근한다.
- When: 배포 후 페이지를 새로고침한다.
- Then: 편집 UI와 프로필 정보가 표시되고 브라우저 오류가 없다.
- Evidence: 페이지 제목 `Hwisik`, `Crop profile image` 버튼 표시, `/pages/founder` HTTP 200 / CPU 18ms / `outcome=ok`, `/auth/get-session` HTTP 200 / CPU 13ms / `outcome=ok`.

### QA-172-02 로그인 상태 프로필 이미지 크롭 적용

- 결과: **Pass**
- Given: 로그인 상태에서 `/founder`의 프로필 이미지가 표시된다.
- When: `Crop profile image`를 열고 `Apply profile image crop`을 누른다.
- Then: 크롭 UI가 닫히고 프로필 화면으로 돌아오며 저장 요청이 성공한다.
- Evidence: 크롭 UI 열림, 적용 후 UI 닫힘, `PATCH /pages/founder` HTTP 200 / CPU 20ms / `outcome=ok`, 브라우저 오류 없음.

### QA-172-03 로그아웃 상태 공개 페이지 조회

- 결과: **Pass**
- Given: 로그아웃한 상태로 전환한다.
- When: `/founder`를 새로고침한다.
- Then: 공개 콘텐츠가 표시되고 설정·프로필 편집 버튼은 표시되지 않는다.
- Evidence: `Create your page` 표시, `Settings`와 `Change profile image` 미표시, `/auth/get-session` 무쿠키 HTTP 200 / CPU 4ms / `outcome=ok`, `/pages/founder` 무쿠키 HTTP 200 / CPU 17ms / `outcome=ok`, 브라우저 오류 없음.

### QA-172-04 관련 정상·오류 API 응답

- 결과: **Pass**
- Given: 배포된 백엔드에 직접 접근한다.
- When: `/health`와 존재하지 않는 페이지 경로를 조회한다.
- Then: 정상 응답과 404 오류 응답이 각각 계약대로 반환된다.
- Evidence: `/health` HTTP 200 / CPU 10ms / `outcome=ok`, `/pages/__rez172_missing__` HTTP 404 / CPU 10ms / `outcome=ok`.

## CPU 사용량 요약

아래 값은 배포된 Worker 로그의 요청별 `cpuTime`이다. `wallTime`이나 애플리케이션 로그의 응답 시간과 구분한다.

| 초기 QA 시나리오 | 요청별 CPU | 시나리오 합계 | 요청 평균 |
| --- | ---: | ---: | ---: |
| QA-172-01 로그인 상태 페이지 조회 | `/pages/founder` 18ms + `/auth/get-session` 13ms | 31ms | 15.5ms |
| QA-172-02 프로필 이미지 크롭 적용 | `PATCH /pages/founder` 20ms | 20ms | 20ms |
| QA-172-03 로그아웃 상태 공개 페이지 조회 | `/auth/get-session` 4ms + `/pages/founder` 17ms | 21ms | 10.5ms |
| QA-172-04 정상·오류 API 응답 | `/health` 10ms + 존재하지 않는 페이지 10ms | 20ms | 10ms |
| 초기 측정 요청 | 8개 요청 | 92ms | 11.5ms |

QA-172-04의 CPU 값은 2026-08-13 추가 측정에서 같은 배포 버전의 실시간 tail로 확인했다. 합계는 표에 적은 재현 요청만 포함하며, 브라우저가 자동으로 발생시킨 부가 요청은 포함하지 않는다.

### 추가 실측

같은 배포 버전에서 공개 요청을 다시 실행한 결과다.

| 요청 | CPU (`cpuTime`) | Wall (`wallTime`) | 결과 |
| --- | ---: | ---: | --- |
| 무쿠키 `GET /auth/get-session` | 22ms | 23ms | HTTP 200 / `ok` |
| 무쿠키 `GET /pages/founder` | 60ms | 391ms | HTTP 200 / `ok` |

Free 요금제의 10ms는 기본 CPU 제한이다. Cloudflare는 드물게 제한을 넘는 요청을 허용하는 실행 여유가 있지만, 반복적으로 넘으면 요청을 종료한다. 따라서 이번 `22ms`와 `60ms`는 즉시 실패하지 않았을 뿐 안전한 목표값은 아니며, CPU 제한 위험 신호로 기록한다.

## 판정

기존 CPU 제한 경로인 `/auth/get-session`, `/pages/founder`, 크롭 `PATCH /pages/founder`를 로그인·로그아웃 상태에서 모두 확인했다. 새 배포본에서는 CPU 제한 로그가 발생하지 않았고, 모든 확인 요청이 정상 또는 의도한 404 응답으로 끝났다.

## 최신 배포 추가 판정

최신 배포본에서는 무쿠키 세션 조회와 공개 페이지 캐시 적중 경로가 0~10ms 안에 들어왔다. 다만 DB를 다시 읽는 캐시 미적중 공개 페이지와 로그인 세션 조회는 각각 12~31ms가 관측되었다. 모두 `outcome=ok`였지만 Free 요금제의 안전 목표인 10ms 이하를 항상 만족한다고 볼 수 없다. 따라서 현재 개선은 반복적인 불필요 작업과 공개 캐시 경로를 줄인 상태이며, 콜드 DB·인증 경로의 10ms 이하 보장은 별도 구조 개선이 필요하다.
