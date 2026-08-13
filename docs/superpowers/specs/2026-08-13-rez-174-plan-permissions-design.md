# REZ-174 플랜 권한 및 기능 제한 설계

## 1. 목표

Free와 Pro 정책을 서버 권한 검사와 프론트 페이지 관리 경험에 적용한다.

이 설계의 핵심 목표는 다음과 같다.

- 브라우저 요청이나 UI 우회만으로 플랜 제한을 넘을 수 없게 한다.
- Free, Pro, 결제 기간 종료 후 유예기간, 재구독 상태를 같은 기준으로 처리한다.
- `user.primaryPageId`를 primary page의 단일 기준으로 유지한다.
- 유예기간 중 primary page만 편집 가능하게 하고, 다른 페이지는 공개 유지·읽기 전용으로 제공한다.
- 유예기간 종료 후 최신 primary page를 보호하면서 나머지 페이지와 관련 자산을 안전하게 삭제한다.

## 2. 현재 구조와 범위

Grabbin은 Cloudflare Worker + Hono + Drizzle + PostgreSQL 구조다. Better Auth의 Creem 플러그인이 구독을 `creem_subscription`에 저장하고, `user.primaryPageId`가 현재 primary page를 가리킨다.

현재 페이지 생성은 계정에 primary page가 없을 때만 허용되고, 페이지 정보·아이템·미디어·프로필 이미지·링크 메타데이터 쓰기 경로가 각각 존재한다. REZ-174는 이 경로들을 하나의 권한 규칙으로 묶는다.

이번 범위에 포함한다.

- 서버의 Free/Pro 페이지 수 제한
- 서버의 페이지·아이템·미디어 수정 권한
- 페이지 목록·전환·primary 변경·삭제 UI
- primary page 삭제 보호
- 취소 후 결제 기간 종료, 7일 유예기간, 재구독, 자동 삭제
- R2 자산 삭제 Queue와 재시도 경계
- 백엔드 테스트와 수동 QA 시나리오

이번 범위에 포함하지 않는다.

- 커스텀 도메인 저장·연결·해제 기능
- 새로운 고급 위젯
- 별도 `user.plan` 복제 필드
- `pages.isPrimary` 필드
- 계정 탈퇴 흐름 변경
- Supabase 전용 Function/Trigger

커스텀 도메인 기능이 추가될 때는 이 문서의 Pro 권한 계산 함수를 재사용한다.

## 3. 권한 기준

### 3.1 구독 원본

`user.plan`을 저장하지 않는다. 서버는 `creem_subscription`에서 현재 유효한 구독을 읽고 다음 조건으로 Pro 권한을 계산한다.

1. 상품 ID가 허용된 Pro 월간 또는 연간 상품 ID다.
2. 구독 상태가 허용된 상태다.
3. `periodEnd`가 없거나 현재 시각보다 미래다.

취소된 구독도 `periodEnd` 전이고 해당 기간이 유효하면 Pro로 인정한다. `periodEnd`가 지나면 Free 전환 대상으로 본다. 브라우저가 보낸 플랜 값은 사용하지 않는다.

권한 계산은 백엔드의 단일 정책 함수가 담당한다. 컨트롤러·프론트·웹훅이 각자 `status`를 해석하지 않는다.

### 3.2 페이지 상태

`pages`에 다음 필드를 추가한다.

- `lifecycle_status`: `active` 또는 `read_only`
- `deletion_scheduled_at`: 삭제 예정 시각 또는 `NULL`

상태 의미는 다음과 같다.

| 상태 | 의미 |
| --- | --- |
| `active` | 소유자가 페이지 정보를 편집하고 아이템을 변경할 수 있음 |
| `read_only` | 공개 페이지는 유지하지만 소유자 쓰기 요청을 거부함 |

`deletion_scheduled_at`은 해당 페이지가 삭제 대상이 되는 시각이다. 페이지가 아직 `active`인 결제 기간 중에도 웹훅이 일정을 미리 기록할 수 있다. 실제 읽기 전용 전환은 `periodEnd` 이후에 수행한다.

`active`만으로 쓰기 권한을 결정하지 않는다. 모든 쓰기 요청은 최신 구독 권한과 유예기간 중 primary 예외를 함께 확인한다.

### 3.3 primary page

`user.primaryPageId`만 primary page의 기준으로 사용한다. 페이지마다 primary 여부를 저장하지 않는다.

primary 변경은 다음 트랜잭션에서 처리한다.

1. 해당 사용자 행을 잠근다.
2. 대상 페이지가 해당 사용자의 소유인지 확인한다.
3. 현재 유효한 Pro 권한인지 확인한다.
4. `user.primaryPageId`를 대상 페이지 ID로 변경한다.
5. pending downgrade가 있으면 새 primary의 삭제 예정 시각을 비우고 이전 primary가 삭제 대상이 되도록 일정을 보정한다.
6. 트랜잭션을 커밋한다.

페이지 삭제도 같은 사용자 행을 잠근 뒤 최신 `primaryPageId`를 다시 읽는다. 따라서 primary 변경과 삭제가 동시에 실행되어도 primary page를 삭제하지 않는다.

PostgreSQL Function/Trigger는 사용하지 않는다. 현재 DB 쓰기 주체가 이 백엔드 하나이고, 플랜·유예기간은 애플리케이션 정책이므로 서비스 트랜잭션이 더 단순하다. 향후 여러 서비스가 직접 DB를 수정하게 되면 stored procedure를 재검토한다.

## 4. 상태별 권한 표

| 동작 | Free, 페이지 1개 | Pro | 결제 기간 종료 후 유예기간 |
| --- | --- | --- | --- |
| 현재 페이지 보기 | 허용 | 허용 | 허용 |
| 페이지 정보·아이템·미디어 수정 | 허용 | 허용 | 현재 primary만 허용 |
| 새 페이지 생성 | 거부 | 최대 3개까지 허용 | 거부 |
| primary 변경 | 거부 | 허용 | 거부 |
| primary 삭제 | 거부 | 거부 | 거부 |
| 비primary 삭제 | 대상 없음 | 허용 | 확인 후 허용 |
| 페이지 공개 노출 | 허용 | 허용 | 허용 |

유일한 Free 페이지 삭제는 계정 삭제와 다른 동작이며 서버에서 거부한다.

## 5. API 설계

### 5.1 페이지 목록

`GET /pages`를 추가한다. 응답에는 소유 페이지 목록, `isPrimary`, `lifecycleStatus`, `deletionScheduledAt`, handle, 이름, 생성·수정 시각을 포함한다. `isPrimary`는 `user.primaryPageId`와 비교해 계산한다.

기존 `GET /pages/me`는 현재 primary page 조회 용도로 유지해 기존 호출을 깨지 않는다. 새 페이지 선택 메뉴는 `GET /pages`를 사용한다.

### 5.2 생성·변경·삭제

- `POST /pages`: primary가 없는 첫 페이지는 허용한다. 이미 페이지가 있으면 Pro 권한과 현재 페이지 수 3개 미만을 확인한다.
- `PATCH /pages/:handle`: 페이지 정보와 프로필 메타데이터 변경을 처리한다.
- `PATCH /pages/:handle/primary`: Pro에서만 허용한다. 대상 페이지 소유권과 상태를 서버에서 확인한다.
- `DELETE /pages/:handle`: primary가 아닌 소유 페이지에만 허용한다. DB 삭제 전 R2 키를 확보하고, DB 커밋 후 Queue에 삭제 작업을 보낸다.

### 5.3 기존 쓰기 경로 보호

다음 경로는 공통 `assertPageWritable` 정책을 통과해야 한다.

- 페이지 정보 수정
- 아이템 일괄 저장·삭제
- 아이템 미디어 업로드와 완료
- 프로필 이미지 업로드와 완료
- 링크 메타데이터 갱신

검사 순서는 로그인, 소유권, 최신 구독 권한, 페이지 상태, primary 규칙이다. 유예기간에서는 현재 primary만 쓰기를 허용하고 다른 모든 페이지 쓰기를 거부한다.

권한 오류는 프론트가 구분할 수 있는 안정적인 오류 코드를 사용한다. 예시는 `PAGE_LIMIT_REACHED`, `PRIMARY_CHANGE_FORBIDDEN`, `PRIMARY_PAGE_REQUIRED`, `PAGE_READ_ONLY`, `PAGE_DELETE_FORBIDDEN`이다. 오류 메시지에는 Creem 원문이나 내부 예외를 노출하지 않는다.

## 6. 웹훅과 상태 전환

REZ-175에서 서명, 중복, 순서가 보호된 이벤트만 이 흐름에 들어온다.

### 6.1 취소 웹훅

구독 취소 이벤트를 처리할 때 구독의 `periodEnd`를 기준으로 `periodEnd + 7일`을 삭제 예정 시각으로 기록한다. 현재 primary는 해당 시각을 갖지 않고, 당시의 non-primary 페이지에 일정을 기록한다. 페이지는 결제 기간 종료 전까지 `active`다.

결제 기간 중 primary가 바뀌면 같은 트랜잭션에서 pending downgrade 일정을 보정한다. 기간 종료 시점에는 전체 페이지를 다시 계산해 현재 primary에는 `NULL`, 나머지 페이지에는 같은 삭제 예정 시각을 둔다.

웹훅이 기간 종료 후 늦게 도착한 경우에는 구독 상태 저장 뒤 동일한 상태 전환을 즉시 수행할 수 있다.

### 6.2 재구독 웹훅

유효한 Pro 구독이 확인되면 사용자 행을 잠그고 남아 있는 모든 페이지의 예약 상태를 해제한다.

```text
lifecycle_status = 'active'
deletion_scheduled_at = NULL
```

이미 직접 삭제된 페이지는 복구하지 않는다. 복구와 삭제가 경쟁하면 두 작업 모두 사용자 행과 현재 구독 상태를 다시 확인한다.

## 7. 정기 작업과 자산 삭제

현재 Worker에 설정된 매일 Cron을 재사용한다.

정기 작업은 다음 순서로 동작한다.

1. `periodEnd`가 지난 계정을 찾는다.
2. 사용자 행을 잠그고 최신 구독과 primary를 다시 읽는다.
3. Pro가 아니면 primary 외 페이지를 `read_only`로 전환하고 삭제 일정을 보정한다.
4. `deletion_scheduled_at <= now`인 페이지를 최신 primary가 아닌지 다시 확인한다.
5. 페이지의 프로필 이미지, 프로필 이미지 원본, 아이템 미디어 R2 키를 수집한다.
6. 페이지와 하위 아이템을 DB 트랜잭션에서 삭제한다.
7. 커밋 후 수집한 키를 기존 Queue로 보내 R2에서 삭제한다.

Queue는 아이템 미디어뿐 아니라 페이지 프로필 이미지 키도 검증·삭제할 수 있도록 확장한다. 키는 허용된 사용자·페이지 prefix와 자산 형식을 통과한 경우만 삭제한다.

DB 삭제 후 Queue 전송이 실패해도 데이터 손실은 없다. 기존 orphan 정리 작업을 페이지 자산까지 확인하도록 확장해 남은 R2 파일을 보완 삭제한다. 이미 삭제된 페이지를 다시 처리하면 성공으로 간주한다.

정기 작업이 늦었을 때만 인증된 `GET /pages`와 편집기 진입 요청에서 같은 보정 함수를 호출한다. 공개 방문자의 페이지 조회에서는 DB 삭제나 상태 변경을 실행하지 않는다.

## 8. 프론트 설계

기존 편집 화면의 페이지 선택 메뉴에서 다음을 제공한다.

- 소유 페이지 목록과 현재 primary 표시
- 페이지 전환
- Pro의 primary 변경
- 비primary 페이지 삭제
- Pro의 새 페이지 생성
- Free의 업그레이드 안내
- 유예기간 추가 페이지의 `Read-only`와 삭제 예정일 표시

유예기간에서는 current primary만 편집 화면의 입력·드래그·업로드를 활성화한다. 다른 페이지는 공개 화면과 읽기 화면을 제공하되 모든 변경 UI를 잠근다. 추가 페이지 삭제는 확인 절차를 거친다.

프론트 상태는 권한 판단의 근거가 아니다. 서버가 권한 오류를 반환하면 페이지 목록과 구독 상태를 다시 조회해 오래된 UI 상태를 정리한다.

## 9. 데이터 변경과 구현 경계

마이그레이션은 다음만 추가한다.

- `pages.lifecycle_status`의 기본값 `active`, not null
- `pages.deletion_scheduled_at` nullable timestamp
- 정기 조회를 위한 삭제 예정 시각 인덱스
- 기존 모든 페이지를 `active`와 `NULL`로 backfill

기존 `user.primaryPageId` 값은 변경하지 않는다. 기존 계정의 페이지가 이미 하나인 현재 데이터에서는 모든 페이지를 `active`로 유지한다.

프론트 테스트 코드는 작성하지 않는다. 백엔드 정책·서비스·컨트롤러 테스트와 수동 QA 문서를 구현 계획에서 구체화한다.

## 10. 검증 체크리스트

### 권한과 페이지 수

- **PLAN-001**
  - Given: Free 계정에 primary page 하나가 있다.
  - When: UI와 직접 HTTP로 두 번째 페이지를 생성한다.
  - Then: UI는 안내와 함께 막히고 서버는 `PAGE_LIMIT_REACHED`를 반환한다.
  - Evidence: 화면 상태, HTTP 응답, DB 페이지 수.

- **PLAN-002**
  - Given: Pro 계정에 페이지 두 개가 있다.
  - When: 세 번째 페이지를 만들고 네 번째 페이지를 시도한다.
  - Then: 세 번째는 성공하고 네 번째는 서버에서 거부한다.
  - Evidence: HTTP 응답, 페이지 목록, DB 페이지 수.

### primary와 읽기 전용

- **PRIMARY-001**
  - Given: Pro 계정이 소유한 페이지 세 개가 있다.
  - When: primary를 다른 소유 페이지로 변경한다.
  - Then: 한 트랜잭션으로 `user.primaryPageId`가 바뀌고 페이지 목록에는 primary가 하나만 표시된다.
  - Evidence: HTTP 응답, DB 사용자 행, 동시 요청 결과.

- **PRIMARY-002**
  - Given: Free 전환 후 primary A와 추가 페이지 B가 있다.
  - When: B를 primary로 바꾸려 한다.
  - Then: UI와 직접 HTTP 모두 거부되고 B는 읽기 전용으로 유지된다.
  - Evidence: UI 잠금, HTTP 오류 코드, DB 상태.

- **READONLY-001**
  - Given: 결제 기간이 끝나고 A가 primary, B가 추가 페이지다.
  - When: B에서 페이지 수정·아이템 저장·미디어 업로드·프로필 이미지 업로드·메타데이터 갱신을 각각 시도한다.
  - Then: 모든 쓰기 요청이 거부되고 공개 B 페이지는 정상 노출된다.
  - Evidence: 각 HTTP 응답, 공개 페이지 화면, DB 변경 없음.

### 삭제와 복구

- **DELETE-001**
  - Given: primary A와 비primary B가 있다.
  - When: B를 확인 절차 후 삭제한다.
  - Then: B의 DB 행과 하위 아이템이 삭제되고 R2 키가 Queue에 전달된다.
  - Evidence: HTTP 응답, DB 조회, Queue 메시지, R2 상태.

- **DELETE-002**
  - Given: primary A가 있다.
  - When: A를 삭제하거나 동시 요청으로 primary를 삭제하려 한다.
  - Then: 서버가 거부하고 A와 `user.primaryPageId`가 유지된다.
  - Evidence: HTTP 응답, DB 사용자·페이지 행.

- **RESTORE-001**
  - Given: B가 읽기 전용이고 삭제 예정 시각이 아직 지나지 않았다.
  - When: 유효한 Pro 재구독 웹훅을 처리한다.
  - Then: 남아 있는 B가 `active`가 되고 `deletionScheduledAt`이 `NULL`이 된다.
  - Evidence: 웹훅 응답·로그, DB 구독·페이지 행, 편집 요청 성공.

- **CLEANUP-001**
  - Given: 삭제 예정 시각이 지났고 primary A와 추가 페이지 B가 있다.
  - When: 정기 작업을 실행한다.
  - Then: 실행 시점의 최신 primary A는 유지되고 B와 관련 자산은 삭제된다.
  - Evidence: DB 조회, Queue 처리 결과, R2 목록, 공개 A 페이지.

### 보조 검증

- Queue 전송 실패 뒤 orphan 정리가 남은 페이지 자산을 회수하는지 확인한다.
- 같은 정기 작업·웹훅·삭제 요청을 반복해도 상태와 데이터가 중복 변경되지 않는지 확인한다.
- 오래된 프론트 캐시로 요청해도 서버 권한이 최종 기준인지 확인한다.

## 11. 완료 기준

- Free·Pro·유예기간·재구독 권한이 구독 원본에서 일관되게 계산된다.
- 모든 소유자 쓰기 경로가 공통 권한 검사를 사용한다.
- 유예기간 중 primary 변경 우회가 불가능하다.
- primary 삭제와 동시 변경이 보호된다.
- 웹훅 일정 기록, 정기 전환, 7일 후 삭제, 재구독 복구가 연결된다.
- DB 삭제와 R2 Queue 삭제의 실패 경계가 검증된다.
- 프론트 페이지 선택 메뉴가 서버 상태를 표시하고 오류 후 다시 동기화한다.
- 검증 체크리스트의 필수 시나리오와 보조 검증 결과가 기록된다.
