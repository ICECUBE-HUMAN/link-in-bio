# REZ-222·223·225·226·227·228 Next.js 공개 페이지 이관 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the V2 `/blog`, `/blog/[slug]`, `/pricing`, `/privacy`, and `/terms` pages while reading the existing MDX content without copying it.

**Architecture:** Configure the official Next.js `@next/mdx` integration once, then keep each route as a small server page. A server-only content reader reads the existing frontend MDX files and maps their default MDX components for static blog routes; pricing composes existing V2 sections and legal pages share one local page renderer.

**Tech Stack:** Next.js 16 App Router, `@next/mdx`, MDX, React 19, Tailwind CSS 4, Bun, Biome, OpenNext Cloudflare.

**Spec:** `docs/superpowers/specs/2026-08-20-rez-223-225-226-nextjs-public-pages-design.md`

## Global Constraints

- Do not modify or delete existing `apps/frontend` source files.
- Do not modify `apps/frontend/wrangler.jsonc` or add `grabbin.me` path routing.
- Keep all existing blog, privacy, and terms MDX text and frontmatter values unchanged.
- Do not copy blog posts into `apps/v2`; `apps/frontend/src/mdx/post` remains the only post source.
- Use the existing V2 components and SEO helpers before adding new abstractions.
- Do not add frontend automated tests.
- Verify with `bun run check:v2` and `bun run build:v2`.

---

### Task 1: Configure Next.js MDX support

**Files:**

- Modify: `apps/v2/package.json`
- Modify: `apps/v2/next.config.ts`
- Create: `apps/v2/mdx-components.tsx`

**Interfaces:**

- Produces: `.mdx` imports usable by the five route pages and `useMDXComponents()` required by the App Router.

- [ ] Add the four packages documented by Next.js: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, and `@types/mdx`.
- [ ] Wrap the current Next config with `createMDX`, preserve `typedRoutes`, React Compiler, and OpenNext initialization.
- [ ] Add the minimal `useMDXComponents(): MDXComponents` export.
- [ ] Configure `remark-frontmatter` and `remark-mdx-frontmatter` so existing YAML frontmatter becomes a named `frontmatter` export.
- [ ] Run `bun install` and `bun run check:v2`; resolve only MDX-related type or config errors.

### Task 2: Implement the V2 pricing route

**Files:**

- Modify: `apps/v2/app/pricing/page.tsx`

**Interfaces:**

- Consumes: `PlanSection`, `FeatureSection`, `Footer`, `createMetadata`, `createWebPageJsonLd`.
- Produces: a server-rendered `/pricing` page with existing V2 sections and metadata.

- [ ] Export pricing metadata with the existing title, description, canonical path, social image, and keywords.
- [ ] Render the existing plan and feature sections in the same `main`/Footer structure as the old route.
- [ ] Add the existing pricing WebPage JSON-LD node.
- [ ] Keep the existing `/log-in` CTA behavior supplied by V2 `PlanSection`.
- [ ] Run `bun run check:v2`.

### Task 3: Add the shared existing-content reader and MDX component mapping

**Files:**

- Create: `apps/v2/lib/content.tsx`
- Modify: `apps/v2/mdx-components.tsx`

**Interfaces:**

- Produces: `getBlogPosts()`, `getBlogPost(slug)`, `getLegalDocument(name)`, and static MDX component mappings for existing source files.

- [ ] Read the existing frontend MDX files with `gray-matter` and normalize only the fields required by the routes.
- [ ] Keep the blog source directory fixed at `apps/frontend/src/mdx/post` and sort posts by `published` descending.
- [ ] Statically import each existing post MDX file and map it by the parsed slug.
- [ ] Map paragraphs, headings, links, and images to the classes and behavior already produced by the frontend Markdown renderer.
- [ ] Run `bun run check:v2`.

### Task 4: Migrate and render the legal MDX pages

**Files:**

- Modify: `apps/v2/app/privacy/page.tsx`
- Modify: `apps/v2/app/terms/page.tsx`
- Modify: `apps/v2/styles/legal.css` only if an exact parity correction is needed

**Interfaces:**

- Consumes: existing frontend MDX files through `getLegalDocument()`, V2 Footer, Next Metadata.
- Produces: `/privacy` and `/terms` pages with matching title, description, date, body, canonical, and Footer links.

- [ ] Read the existing privacy and terms MDX files without copying or changing them.
- [ ] Read `title`, `description`, and `lastUpdated` from each source file's frontmatter.
- [ ] Export page metadata with each document's title, description, and canonical path.
- [ ] Render the shared legal page structure and the imported MDX body inside `legal-markdown`.
- [ ] Keep links such as `/privacy`, `/terms`, and `mailto:support@grabbin.me` unchanged.
- [ ] Run `bun run check:v2`.

### Task 5: Implement the blog list route

**Files:**

- Create: `apps/v2/app/blog/page.tsx`

**Interfaces:**

- Consumes: `getBlogPosts()`, `Footer`, `JsonLd`, `createMetadata`.
- Produces: `/blog` with the same ordering, links, cards, metadata, and CollectionPage JSON-LD as the existing route.

- [ ] Render the existing blog title, description, category/date cards, and `/blog/[slug]` links.
- [ ] Keep the existing date format and URL encoding.
- [ ] Add the existing WebPage and CollectionPage JSON-LD structure.
- [ ] Render the V2 Footer.
- [ ] Run `bun run check:v2`.

### Task 6: Implement the blog detail route

**Files:**

- Create: `apps/v2/app/blog/[slug]/page.tsx`

**Interfaces:**

- Consumes: `getBlogPost(slug)`, `generateStaticParams`, `notFound`, `Footer`, `JsonLd`.
- Produces: static `/blog/[slug]` pages with article metadata and 404 for unknown slugs.

- [ ] Generate all existing post slugs and set `dynamicParams = false`.
- [ ] Return `notFound()` when the slug is absent.
- [ ] Render the existing back link, category/date, title, description, and MDX body surface.
- [ ] Add canonical metadata, article Open Graph data, and the existing BlogPosting JSON-LD fields.
- [ ] Run `bun run check:v2`.

### Task 7: Verify all six routes

**Files:**

- No new test files.

**Interfaces:**

- Consumes: completed V2 route implementation.
- Produces: build and response evidence for all six pages and an unknown blog slug.

- [ ] Run `bun run check:v2`.
- [ ] Run `bun run build:v2`.
- [ ] Start the V2 dev server and request `/blog`, `/blog/<each slug>`, `/pricing`, `/privacy`, and `/terms` with curl.
- [ ] Confirm all known pages are 200 and include the expected title, canonical URL, content, and Footer links.
- [ ] Confirm an unknown `/blog/not-a-real-post` returns the Next.js 404 response.
- [ ] Confirm `git diff -- apps/frontend` is empty.
