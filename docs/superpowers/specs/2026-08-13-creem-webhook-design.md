# REZ-175 Creem 웹훅 처리 및 테스트 설계

## 목표

Creem이 보내는 웹훅을 Better Auth 공식 Creem 플러그인으로 받고, 인증 사용자에게 연결된 구독 상태를 안전하게 동기화한다. 성공·실패·중복·잘못된 서명·순서가 뒤바뀐 이벤트를 검증한다.

## 현재 구조와 확인 결과

- 서버는 Better Auth의 `creem({ persistSubscriptions: true })`를 사용한다.
- 웹훅 주소는 `/auth/creem/webhook`이며 플러그인이 `creem-signature`를 검증한다.
- 플러그인은 `checkout.completed`와 구독 상태 이벤트를 `creem_subscription`에 저장한다.
- 플러그인은 같은 상태를 다시 쓰는 재전송에는 안전하지만, 오래된 이벤트가 최신 상태를 덮어쓰는 순서 보호는 제공하지 않는다.

## 결정

### 1. 공식 플러그인 경계 유지

서명 검증과 웹훅 endpoint는 공식 플러그인에 맡긴다. 자체 웹훅 URL, 별도 이벤트 로그 테이블, Creem API 재조회는 추가하지 않는다.

### 2. 구독 행에 마지막 승인 이벤트 스냅샷 저장

`creem_subscription`에 다음 nullable 필드를 추가한다.

- `lastWebhookId`: 마지막으로 승인한 Creem 웹훅 ID
- `lastWebhookCreatedAt`: 마지막으로 승인한 웹훅 생성 시각
- `lastWebhookState`: 마지막 승인 상태의 작은 JSON 스냅샷

공식 플러그인이 먼저 상태를 반영한 뒤 callback을 호출하므로 callback은 다음 규칙으로 최종 상태를 정리한다.

- 새 이벤트 시각이 더 늦으면 현재 상태를 승인하고 스냅샷을 갱신한다.
- 같은 웹훅 ID면 같은 상태를 다시 적용해도 결과가 변하지 않는다.
- 더 이른 이벤트면 스냅샷의 승인 상태를 복원하고 스냅샷을 바꾸지 않는다.
- 스냅샷이 없는 기존 행은 첫 수신 이벤트를 기준으로 초기화한다.

이는 이벤트 원문을 보관하는 로그가 아니라 구독의 현재 상태를 복원하기 위한 최소 메타데이터다.

### 3. 상태 범위

`checkout.completed`, `subscription.active`, `subscription.trialing`, `subscription.paid`, `subscription.canceled`, `subscription.expired`, `subscription.unpaid`, `subscription.update`, `subscription.past_due`, `subscription.paused`를 처리한다. 구독 ID와 `metadata.referenceId`로 사용자를 연결하고, 공식 플러그인이 만든 구독 행을 보정한다.

### 4. 오류 처리

- 서명이 없거나 틀리면 공식 플러그인이 `400`으로 거부하고 DB를 변경하지 않는다.
- 알 수 없는 이벤트나 JSON 오류는 공식 플러그인의 오류 응답을 사용한다.
- 사용자 연결 정보가 없는 이벤트는 로그만 남기고 성공 응답을 유지하는 공식 플러그인 동작을 따른다.
- 비밀값과 고객 식별자는 응답·테스트 로그에 출력하지 않는다.

## 검증

- 공식 서명 생성 함수로 올바른 서명은 통과하고 잘못된 서명은 실패하는지 확인한다.
- 상태 보정 helper에서 성공·실패 상태와 중복 이벤트 결과를 확인한다.
- 더 늦은 이벤트 후 더 이른 이벤트를 적용해도 최신 상태와 스냅샷이 유지되는지 확인한다.
- Better Auth 설정에 callback이 연결되어 있는지 확인하고 백엔드 전체 테스트를 실행한다.
- 프론트엔드 테스트는 추가하지 않는다.

## 참고

- [Creem Better Auth plugin](https://github.com/armitage-labs/creem/tree/main/packages/better-auth)
- [Better Auth plugin schema](https://better-auth.com/docs/beta/concepts/plugins#schema)
