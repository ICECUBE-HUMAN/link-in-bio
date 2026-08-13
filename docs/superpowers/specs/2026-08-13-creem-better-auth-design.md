# REZ-164 Creem 결제·구독 연동 설계

## 목표

인증된 Grabbin 사용자가 Creem Checkout으로 결제를 시작하고, Creem webhook으로 저장된 구독 상태를 조회할 수 있게 한다.

## 현재 구조

- 백엔드는 Cloudflare Worker + Hono이며 Better Auth와 Drizzle PostgreSQL adapter를 사용한다.
- Better Auth 기본 테이블은 `user`, `session`, `account`, `verification`이다.
- `@creem_io/better-auth`와 `@creem_io/webhook-types`는 이미 설치되어 있다.
- 프론트는 `better-auth/client`의 `authClient`를 한 곳에서 만들고 `credentials: "include"`를 사용한다.

## 결정

### 1. 공식 Creem Better Auth 플러그인을 서버 기준으로 사용

`creem({ persistSubscriptions: true })`를 Better Auth 설정에 추가한다. 플러그인이 다음을 담당한다.

- `creem_subscription` 저장 구조
- 사용자 `creemCustomerId`, `hadTrial` 확장 필드
- Checkout, Portal, subscription 조회·취소 endpoint
- `creem-signature` 검증과 webhook 상태 저장

Webhook endpoint는 기존 Better Auth base path 아래의 `/auth/creem/webhook`을 사용한다. 이번 이슈에서는 자체 webhook endpoint나 중복 이벤트 로그를 추가하지 않는다. 상세 webhook 시나리오와 순서 뒤바뀐 이벤트 검증은 `REZ-175` 범위다.

### 2. Drizzle 스키마와 migration을 플러그인 스키마에 맞춘다

Drizzle schema에 Creem 플러그인 필드를 명시한다.

- `user.creemCustomerId`: Creem customer ID
- `user.hadTrial`: trial 사용 여부
- `creemSubscription`: `creem_subscription` 테이블
  - `id`
  - `productId`
  - `referenceId`
  - `creemCustomerId`
  - `creemSubscriptionId`
  - `creemOrderId`
  - `status`
  - `periodStart`
  - `periodEnd`
  - `cancelAtPeriodEnd`

`referenceId`는 Better Auth 사용자 ID를 가리키며, 사용자 삭제 시 subscription도 함께 삭제되도록 외래 키를 둔다. Creem API secret과 webhook secret은 DB에 저장하지 않는다.

### 3. 상태 조회는 저장된 subscription을 단일 기준으로 사용

`GET /billing/status`를 추가한다. 현재 로그인 사용자의 `creem_subscription` 중 가장 최근 구독을 찾아 다음을 반환한다.

- `status`: Creem 원본 상태
- `hasAccess`: `active`, `trialing`, `paid`이고 기간이 아직 끝나지 않았는지
- `productId`
- `periodStart`, `periodEnd`
- `cancelAtPeriodEnd`
- 구독이 없을 때의 `none` 상태

구독 상태는 앱의 별도 복제 테이블에 다시 저장하지 않는다. 플러그인이 webhook으로 갱신한 저장값을 읽어 drift를 줄인다.

### 4. 프론트는 기존 authClient에 Creem client plugin만 연결

기존 인증 동작은 유지하고 `creemClient()`를 추가한다. 이후 결제 화면은 다음 API를 사용한다.

- `authClient.creem.createCheckout({ productId })`
- `authClient.creem.createPortal()`
- `authClient.creem.retrieveSubscription({ id })`

이번 이슈에서 새 Billing 화면 전체를 만들지는 않는다. 결제·구독 API 경계를 연결하고, 후속 UI 이슈가 같은 client contract를 사용하게 한다.

## 오류 처리

- Creem secret이 없으면 서버 시작 시 조용히 실패하지 않고 설정 오류를 반환한다.
- 인증되지 않은 `/billing/status`는 `401`을 반환한다.
- 구독이 없으면 오류가 아니라 `status: "none"`을 반환한다.
- Checkout API 오류는 Creem 오류 내용을 그대로 노출하지 않고 안전한 일반 오류로 변환한다.
- 실제 Creem Test mode 결제와 webhook delivery 증거가 없으면 배포 완료로 주장하지 않는다.

## 검증

- migration 생성 결과에 `creem_subscription`과 user 확장 컬럼이 포함되는지 확인한다.
- `bun run typecheck`와 백엔드 기존 테스트를 실행한다.
- 인증 없는 billing status가 `401`, 인증 사용자에게 구독 없음이 `none`인지 확인한다.
- Creem secret이 준비된 환경에서 Checkout URL과 webhook endpoint를 수동 확인한다.

## 참고 문서

- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Better Auth database schema and plugin schema](https://better-auth.com/docs/concepts/database)
- [Creem Better Auth plugin](https://github.com/armitage-labs/creem/tree/main/packages/better-auth)
