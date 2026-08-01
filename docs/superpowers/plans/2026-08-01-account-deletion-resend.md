# Resend 계정 삭제 구현 계획

1. `apps/backend/src/core/auth.options.ts`에 삭제 검증 메일 발송 함수를 추가하고 `sendDeleteAccountVerification`에 연결한다.
2. `apps/frontend/src/components/page/page-settings-menu.tsx`에서 삭제 메뉴를 활성화하고, `callbackURL`을 포함한 삭제 요청 및 메일 확인 상태를 구현한다.
3. backend 타입체크와 frontend 빌드를 실행한다.
4. 정적 검증의 한계를 기록하고, Resend 대시보드의 발송 결과와 인증 메일 링크 클릭은 실제 계정으로 별도 확인한다.
