# hono-starter

Hono + Cloudflare Workers 기준으로 `Better Auth + Supabase + Drizzle ORM` 기본 설정이 들어간 스타터입니다.

## 설치

```sh
bun install
```

## 필요한 값

Worker 런타임:

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `AUTH_EMAIL_FROM`
- `DATABASE_URL`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `RESEND_API_KEY`

권장 구성:

- 로컬/CLI는 Supabase `Shared Pooler` URI를 `DATABASE_URL`로 사용
- `BETTER_AUTH_URL`은 로컬에서는 `.dev.vars.local`, 프로덕션에서는 Worker secret/vars로 설정
- `wrangler.jsonc`에는 로컬 URL을 두지 않음

로컬 개발:

- `.dev.vars.example`를 복사해서 `.dev.vars.local` 생성
- `bun run dev`는 `--env local` 이라 `.dev.vars.local` 값을 읽음

프로덕션:

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`은 `wrangler secret put`
- `AUTH_EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `RESEND_API_KEY`도 secret로 설정
- `FRONTEND_URL`만 공개 설정이면 `wrangler.jsonc`의 `vars` 또는 환경별 `vars` 사용

## 스크립트

```sh
bun run dev
bun run cf-typegen
bun run auth:generate
bun run db:generate
bun run typecheck
```

## 메모

- Better Auth 라우트는 `/api/auth/*`
- Drizzle 스키마는 `src/db/schema.ts`
- Supabase pooler를 쓰므로 prepared statement를 자동으로 끕니다.
- 로그인 옵션은 이메일/비밀번호, 매직 링크, Google, GitHub 입니다.

## Profile image R2 setup

The backend expects an R2 bucket binding named `IMAGES` pointing to the
`test-images` bucket. Configure these Worker secrets before deploying:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

The access key must be an R2 API token with Object Read and Object Write access
to `test-images`. The browser uploads through a short-lived presigned PUT URL;
the bucket must have CORS configured to allow the frontend origin to send PUT
requests with the `Content-Type` header.

Make the bucket publicly readable through an R2 custom domain (or an `r2.dev`
subdomain for development) and configure the matching `VITE_R2_PUBLIC_URL` in
the frontend. Database rows store only the object key, such as
`users/profile/uuid.webp`.
