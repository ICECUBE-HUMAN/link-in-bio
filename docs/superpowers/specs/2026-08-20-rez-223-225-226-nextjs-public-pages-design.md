# REZ-222·223·225·226·227·228 Next.js 공개 페이지 이관 설계

## 목적

기존 블로그 읽기 기반·목록·상세, 요금제·개인정보처리방침·이용약관 화면을 `apps/v2`의 Next.js App Router에서 제공한다. 기존 `apps/frontend`의 콘텐츠와 화면 스타일을 유지하고, V2에서 각 경로를 독립적으로 되돌릴 수 있는 파일 경계를 둔다.

## 범위

- `/pricing`에 기존 요금제 화면의 요금제, 기능 소개, Footer, SEO 메타데이터, WebPage JSON-LD를 제공한다.
- `/privacy`와 `/terms`에 기존 MDX 문서를 그대로 렌더링한다.
- 기존 게시물 MDX 파일을 복제하지 않고 Next.js 빌드에서 읽을 수 있는 목록·앞머리 정보·본문 컴포넌트 매핑을 제공한다.
- `/blog`에 기존 게시물 목록과 CollectionPage JSON-LD를 제공한다.
- `/blog/[slug]`에 기존 게시물 본문, 게시물 SEO, BlogPosting JSON-LD, 없는 slug의 404를 제공한다.
- Next.js 공식 MDX 방식인 `@next/mdx`, `withMDX`, `mdx-components.tsx`, MDX import를 사용한다.
- 기존 YAML frontmatter는 Next.js 공식 문서가 안내하는 `remark-frontmatter`와 `remark-mdx-frontmatter`로 읽는다.
- 기존 `apps/frontend/src/styles/legal.css`와 같은 법률 문서 스타일을 V2에 적용한다.
- 기존 `apps/frontend`의 코드와 배포 설정은 수정하지 않는다.

## 제외

- `grabbin.me`의 경로별 Cloudflare 라우팅 변경
- 로그인·세션·결제 API 연동
- 기존 앱의 라우트 삭제 또는 리다이렉트
- 법률 문서 내용의 수정
- 블로그 게시물 내용의 수정 또는 복제
- 프론트엔드 자동 테스트 작성

## 설계

### 요금제 페이지

`apps/v2/app/pricing/page.tsx`가 기존 V2의 `PlanSection`, `FeatureSection`, Footer를 조합한다. `PlanSection`의 CTA는 현재 V2와 같이 `/log-in`으로 연결하고, SEO는 기존 `/pricing`의 제목·설명·canonical·키워드·WebPage JSON-LD를 재사용한다.

### MDX

Next.js의 `withMDX` 설정으로 `.mdx` import를 활성화하고, 프로젝트 루트의 `mdx-components.tsx`에서 기본 MDX 컴포넌트 확장 지점을 제공한다. 개인정보처리방침과 이용약관은 기존 `apps/frontend/src/mdx` 파일을 직접 import하고, 서버 전용 읽기 모듈로 frontmatter에서 제목·설명·최종 수정일을 읽어 각 페이지의 metadata와 문서 헤더에 사용한다.

### 법률 문서 화면

두 페이지는 같은 화면 구조를 사용한다. 상단에 제목·설명·최종 수정일을 표시하고, MDX 본문을 `legal-markdown` 래퍼 안에 렌더링한다. V2의 `styles/legal.css`는 기존 `apps/frontend/src/styles/legal.css`와 바이트 단위로 맞춘다. 각 페이지 아래에는 V2 Footer를 둔다.

### 블로그 콘텐츠와 경로

`apps/frontend/src/mdx/post`를 단일 콘텐츠 원본으로 유지한다. V2의 서버 전용 콘텐츠 읽기 모듈은 기존 frontmatter를 읽어 `title`, `slug`, `description`, `published`, `authors`, `category`, `image`를 만들고, 각 파일의 MDX default export를 정적 매핑한다. 따라서 게시물 파일을 복제하지 않으면서 Next.js MDX 컴파일러로 본문을 렌더링할 수 있다.

`/blog`는 게시일 내림차순 목록과 기존 카드 구조를 사용한다. `/blog/[slug]`는 `generateStaticParams`로 모든 기존 slug를 정적으로 만들고 `dynamicParams = false`로 없는 slug를 404 처리한다. 블로그 본문은 기존 렌더러가 적용하던 문단·제목·이미지·내부 링크 스타일을 `mdx-components.tsx`에서 재현한다.

### 경로 소유권

현재 `apps/v2/wrangler.jsonc`는 `v2.grabbin.me` Custom Domain만 소유하고 `apps/frontend/wrangler.jsonc`는 `grabbin.me` 전체를 소유한다. 따라서 이번 변경은 V2의 다섯 페이지 구현으로 한정하고, 운영 도메인의 경로별 분기는 별도 인프라 작업으로 남긴다.

## 오류 처리

- MDX 빌드 실패는 `check:v2`와 `build:v2`에서 즉시 확인한다.
- 문서 metadata가 누락되지 않도록 기존 frontmatter 키를 그대로 사용한다.
- 페이지 자체는 서버 컴포넌트로 유지해 metadata가 초기 HTML에 포함되게 한다.

## 검증

- `bun run check:v2`
- `bun run build:v2`
- 로컬 V2에서 `/pricing`, `/privacy`, `/terms`의 200 응답 확인
- 로컬 V2에서 `/blog`, 모든 기존 `/blog/[slug]`, 없는 slug의 404 확인
- 생성 HTML에서 제목, canonical, 문서 본문, Footer 링크 확인
- `apps/frontend`와 두 Wrangler 설정에 불필요한 diff가 없는지 확인

## 되돌리기

V2에서 새로 추가한 페이지 파일과 MDX 설정·읽기 모듈만 되돌리면 된다. 기존 앱은 수정하지 않으므로 별도 복구가 필요 없다.
