# Resend 계정 삭제 검증 메일 설계

## 목적

Sinabro 계정 삭제를 Better Auth의 hard delete 흐름으로 유지하면서, 삭제 의도를 Resend 이메일 링크로 한 번 더 확인한다.

## 범위

- Better Auth `user.deleteUser.sendDeleteAccountVerification`에 Resend 발송을 연결한다.
- 기존 `authClient.deleteUser` 호출은 삭제 요청을 생성하는 단계로 사용한다.
- 설정 메뉴의 계정 삭제 UI를 활성화하고, 요청 성공 시 메일 확인 안내를 표시한다.
- 메일 링크는 Better Auth가 생성한 URL을 그대로 사용하며, 삭제 완료 뒤 프론트엔드 루트로 이동한다.

## 비범위

- 신규 데이터베이스 컬럼 또는 마이그레이션
- 사용자 데이터 보존/익명화 정책
- 계정 삭제 완료 전용 신규 라우트

## 보안 및 실패 처리

- 삭제 URL과 토큰은 Better Auth가 생성하므로 애플리케이션이 토큰을 직접 저장하거나 조합하지 않는다.
- `RESEND_API_KEY`가 없거나 Resend가 오류를 반환하면 삭제 요청을 실패 처리한다.
- 삭제 요청 응답은 실제 삭제 완료가 아니라 검증 메일 발송 요청이 성공했다는 의미로 UI에 표시한다.

## 검증 기준

- backend 타입체크가 통과한다.
- frontend 빌드가 통과한다.
- 인증된 사용자가 Delete Account를 선택하면 Resend 발송 콜백이 호출되고, 메일 링크가 Better Auth 삭제 엔드포인트로 연결된다.
