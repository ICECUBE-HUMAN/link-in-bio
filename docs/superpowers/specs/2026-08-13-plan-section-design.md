# PlanSection 설계

## 목표

홈 화면에 Free와 Pro 요금제 카드를 보여주고, Pro의 월간·연간 선택을 Creem Checkout과 연결한다.

## 설계

- `apps/frontend/src/components/layout/sections/plan-section.tsx`에 `PlanSection`을 만든다.
- 카드 내용과 가격 표시 문구는 프론트 코드에 둔다.
- 실제 결제 상품은 Creem의 `productId`를 기준으로 한다.
- `prod_1M7K6uOQxjMu006ypD04R`를 Pro 월간 상품 ID로 연결한다.
- `prod_6oaKuPlsztLLAQt3Y5BlqD`를 Pro 연간 상품 ID로 연결한다.
- 로그인한 사용자는 `authClient.creem.createCheckout` 호출 후 반환된 URL로 이동한다.
- 로그인하지 않은 사용자는 기존 `/log-in`으로 이동한다.
- Free 카드는 가입 CTA로 연결하고 유료 결제는 시작하지 않는다.
- `index.tsx`에서는 `FeatureSection` 다음, `CTASection` 전에 렌더링한다.

## 화면 구조

```text
PlanSection
├── 제목과 설명
└── 요금제 카드 그리드
    ├── Free
    └── Pro
        ├── Monthly / Yearly 선택
        └── 선택한 상품 Checkout 버튼
```

## 범위 밖

- Creem 상품 자동 조회
- 연간 상품 생성
- 프론트엔드 테스트 추가
- 구독 상태를 이용한 현재 플랜 표시

## 확인 기준

- 홈 화면에 두 카드가 표시된다.
- 모바일에서는 세로, 넓은 화면에서는 두 열로 배치된다.
- 월간 선택은 지정된 상품 ID를 사용한다.
- 월간·연간 선택에 맞는 상품 ID로 Checkout을 시작한다.
- Checkout 응답 URL로 이동하고, 오류 시 버튼이 다시 활성화된다.
