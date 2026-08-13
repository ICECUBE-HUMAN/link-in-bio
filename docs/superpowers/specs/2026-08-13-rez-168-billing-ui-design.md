# REZ-168 결제 UI 통합 설계

## 목표

홈의 요금제 카드는 정적 정보와 결제 시작만 담당하고, 로그인 사용자의 현재 플랜·페이지 관리·플랜 변경은 페이지 설정 메뉴에서 처리한다.

## 설계

- `PlanSection`은 Free/Pro 가격과 기능을 정적으로 표시한다.
- 비로그인 사용자가 Pro 결제를 시작하면 `/log-in`으로 이동한다.
- 로그인 사용자가 Pro 결제를 시작하면 `@sinabro/plan`의 상품 ID를 사용해 `authClient.creem.createCheckout({ productId })`를 호출한다.
- `PlanSection`에서는 구독 상태를 조회하지 않으며 활성 구독 여부에 따라 버튼 문구를 바꾸지 않는다.
- `PageSettingsMenu`는 기존 `getOwnedPages` 응답의 `hasAccess`를 현재 플랜 표시의 기준으로 사용한다. `true`는 Pro, `false`는 Free로 표시한다.
- Free 사용자에게는 `Manage page` 메뉴를 표시하지 않는다.
- Pro 사용자에게는 `Manage page`와 `Generated pages n/3`를 세로로 표시한다. 클릭하면 같은 메뉴의 두 번째 화면에서 페이지 목록을 보여준다.
- 페이지 목록은 primary 페이지를 먼저 정렬하고, 각 페이지의 primary 변경·삭제 동작은 아이콘 버튼으로 표시한다. 기존 생성·페이지 이동·삭제 후 현재 페이지 이동 동작은 유지한다.
- `Change plan` 메뉴는 `Current plan · Free/Pro`와 `Upgrade your plan` 또는 `Downgrade your plan`을 세로로 표시한다. 클릭 시 기존 Creem portal API를 호출해 반환된 URL로 이동한다.
- 기존 `PagePicker`는 제거하고 `PageSettingsMenu`가 페이지 목록 조회와 동작을 소유한다.
- 현재 사용자의 primary가 아닌 읽기 전용 페이지의 `Page controls` aside 안에 `This page is read-only and will be deleted soon.` 문구를 표시한다. 만료·취소·유예 상태를 별도 구분하지 않는다.
- 제한 상태에서 별도 업그레이드 안내는 추가하지 않는다.

## 데이터 흐름

```text
PlanSection
  ├─ anonymous -> /log-in
  └─ signed-in -> authClient.creem.createCheckout -> Creem Checkout

PageSettingsMenu
  └─ GET /pages -> hasAccess + pages
       ├─ hasAccess=false -> Current plan Free + Upgrade your plan
       └─ hasAccess=true  -> Current plan Pro + Downgrade your plan
                         └─ Manage page -> primary-first page list
```

## 오류 처리

- 기존 Checkout 오류 문구와 버튼 복구 동작을 유지한다.
- Creem portal URL이 없거나 호출 오류가 나면 설정 메뉴 안에 오류 문구를 표시한다.
- 페이지 생성·삭제·primary 변경 오류는 기존 동작처럼 메뉴 안에 표시한다.

## 범위 밖

- 만료·취소·유예 상태의 별도 표시
- 제한 상태의 업그레이드 CTA
- 기존 `/billing/checkout` 경로 제거
- 프론트엔드 테스트 추가

## 확인 기준

- `PlanSection`에 billing status 조회가 없고 월간·연간 결제 시작은 동작한다.
- Free 사용자는 `Manage page`를 보지 못하고, Free/Pro 현재 플랜과 변경 문구를 본다.
- Pro 사용자는 `Manage page`에서 페이지 수와 primary-first 목록을 보고 아이콘으로 primary/delete를 수행한다.
- `PagePicker`는 렌더링되지 않는다.
- 추가 페이지가 읽기 전용이면 Page controls 안에 안내 문구가 나타난다.
