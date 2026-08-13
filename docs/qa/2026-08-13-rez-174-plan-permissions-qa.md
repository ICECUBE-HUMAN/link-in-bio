# REZ-174 플랜 권한 및 기능 제한 QA

## 목적과 범위

Free·Pro·유예기간·재구독 상태에서 페이지 생성, primary 변경, 편집 제한, 삭제·복구·정기 정리를 확인한다. 프론트엔드 테스트 코드는 추가하지 않으며, 브라우저·HTTP·DB·Queue·R2 증거를 함께 기록한다.

## 테스트 환경과 기준선

- 환경: 로컬 Worker 또는 검증용 Preview, Creem Test Mode, 최신 migration 적용 DB
- 계정: Free 계정 1개, Pro 계정 1개, 재구독 웹훅을 받을 수 있는 Pro 계정 1개
- 기준선 기록: `user.id`, `primaryPageId`, 페이지 ID·handle·`lifecycleStatus`, `deletionScheduledAt`, 구독 `productId`·`periodEnd`, 페이지 아이템과 R2 키
- 삭제 시 주의: `DELETE-001`, `DELETE-002`, `CLEANUP-001` 실행 전 DB와 R2 기준선을 저장하고, 검증 후 남은 Test 계정·페이지를 정리한다.
- 결과 값: `Pass` / `Fail` / `Blocked` / `Not Run`

## 필수 시나리오

### PLAN-001 — Free 두 번째 페이지 차단

- Given: Free 계정에 primary page 하나가 있다.
- When: UI와 직접 HTTP로 두 번째 페이지를 생성한다.
- Then: UI는 안내와 함께 막히고 서버는 `PAGE_LIMIT_REACHED`를 반환한다.
- Evidence: 화면 상태, HTTP 응답 body, DB 페이지 수.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### PLAN-002 — Pro 세 번째 허용, 네 번째 차단

- Given: Pro 계정에 페이지 두 개가 있다.
- When: 세 번째 페이지를 만들고 네 번째를 시도한다.
- Then: 세 번째는 성공하고 네 번째는 거부된다.
- Evidence: HTTP 응답, 페이지 목록, DB 페이지 수.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### PRIMARY-001 — Pro primary 변경

- Given: Pro 계정이 소유한 페이지 세 개가 있다.
- When: 다른 소유 페이지로 primary 변경을 요청한다.
- Then: 한 트랜잭션으로 `user.primaryPageId`가 바뀌고 primary는 하나만 남는다.
- Evidence: HTTP 응답, DB 사용자 행, 동시 요청 결과.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### PRIMARY-002 — Free 전환 후 primary 변경 차단

- Given: Free 전환 후 primary A와 추가 페이지 B가 있다.
- When: B를 primary로 바꾸려 한다.
- Then: UI와 직접 HTTP 모두 거부되고 B는 읽기 전용으로 유지된다.
- Evidence: UI 잠금, 오류 코드, DB lifecycle 상태.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### READONLY-001 — 추가 페이지 쓰기 차단

- Given: 결제 기간이 끝나고 A가 primary, B가 추가 페이지다.
- When: B에서 페이지 수정·아이템 저장·미디어 업로드·프로필 이미지 업로드·메타데이터 갱신을 각각 시도한다.
- Then: 모든 쓰기 요청이 거부되고 공개 B 페이지는 정상 노출된다.
- Evidence: 각 HTTP 응답, 공개 페이지 화면, DB 변경 없음.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### DELETE-001 — 비primary 페이지 삭제

- Given: primary A와 비primary B가 있고 B에 하위 아이템·R2 자산이 있다.
- When: 확인 절차 후 B를 삭제한다.
- Then: B의 DB 행과 하위 아이템이 삭제되고 R2 키가 Queue에 전달된다.
- Evidence: HTTP 응답, DB 조회, Queue 메시지, R2 상태.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### DELETE-002 — primary 삭제 차단

- Given: primary A가 있다.
- When: A를 삭제하거나 동시 요청으로 primary를 삭제한다.
- Then: 서버가 거부하고 A와 `user.primaryPageId`가 유지된다.
- Evidence: HTTP 응답, DB 사용자·페이지 행.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### RESTORE-001 — 재구독 복구

- Given: B가 읽기 전용이고 삭제 예정 시각이 아직 지나지 않았다.
- When: 유효한 Pro 재구독 웹훅을 처리한다.
- Then: 남아 있는 B가 `active`가 되고 `deletionScheduledAt`이 `NULL`이 된다.
- Evidence: 웹훅 응답·로그, DB 구독·페이지 행, 편집 요청 성공.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### CLEANUP-001 — 정기 삭제

- Given: 삭제 예정 시각이 지났고 primary A와 추가 페이지 B가 있다.
- When: 정기 작업을 실행한다.
- Then: 최신 primary A는 유지되고 B와 관련 자산은 삭제된다.
- Evidence: DB 조회, Queue 처리 결과, R2 목록, 공개 A 페이지.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

## 보조 검증

### AUX-001 — Queue 실패 뒤 orphan 정리

- Given: 페이지 DB 삭제는 성공했지만 Queue 전송이 실패했다.
- When: 24시간 뒤 orphan 정리를 실행한다.
- Then: 남은 페이지 자산이 허용된 키 형식으로만 회수된다.
- Evidence: Queue 오류 로그, 정기 작업 로그, R2 목록.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

### AUX-002 — 반복 요청과 오래된 프론트 상태

- Given: 같은 삭제·웹훅·정기 작업을 반복하거나 오래된 페이지 목록을 가진 브라우저가 있다.
- When: 요청을 반복하고 오래된 화면에서 쓰기 요청을 보낸다.
- Then: 상태·데이터가 중복 변경되지 않고 서버 권한이 최종 기준이 된다.
- Evidence: HTTP 응답, DB 행 수, 페이지 목록 재조회, 화면 동기화.
- Result: `Not Run`
- Follow-up Issue: Fail 또는 Blocked이면 이 줄에 issue ID를 기록한다.

## 현재 자동 검증 기록

- Backend `bun test`: `Pass` — 108 tests, 0 failures.
- Backend TypeScript 5.9 compatibility check: `Blocked` — 기존 `billing.controller.ts`의 Creem SDK `checkoutUrl` 타입 오류 1건과 기존 billing controller test 타입 오류 1건.
- Frontend build: `Blocked` — 기존 `framer-motion` 모듈 누락.
- Frontend typecheck: `Blocked` — 기존 `framer-motion` 및 API upload 응답 `unknown` 오류.
- Frontend tests: `Not Run` — 프로젝트 지침에 따라 추가·실행하지 않음.
