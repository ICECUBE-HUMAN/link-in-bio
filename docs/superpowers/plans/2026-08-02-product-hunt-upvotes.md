# Product Hunt Upvotes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich Product Hunt Product Pages at `/products/{slug}` through the official API and render the latest launch's upvote total in the link action.

**Architecture:** A dedicated backend enricher validates the launch URL, fetches Product Hunt's GraphQL `post` query with a server-only token, and merges `upvoteCount` into link metadata. The link renderer maps that metadata only for Product Hunt and passes a filled triangle as the LinkAction detail icon.

**Tech Stack:** TypeScript, Bun test, Hono/Cloudflare Workers, Product Hunt GraphQL API, React, reicon-react.

## Global Constraints

- Medium and Product Hunt `/posts/{slug}` URLs are out of scope.
- Call Product Hunt only from the backend using `PRODUCT_HUNT_TOKEN`; never expose or persist the token.
- On an API failure, use the existing generic metadata fallback without an upvote detail.
- Do not add frontend tests.

---

### Task 1: Add the Product Hunt backend enricher

**Files:**
- Create: `apps/backend/src/services/product-hunt-link-provider.ts`
- Create: `apps/backend/src/services/product-hunt-link-provider.test.ts`
- Modify: `apps/backend/src/services/link-providers.ts:4-38,463-522`
- Modify: `apps/backend/wrangler.jsonc:7-35`
- Modify: `apps/backend/worker-configuration.d.ts:5-41`

**Interfaces:**
- Consumes: `LinkProvider["enrich"]`, `LinkProviderContext`, and the existing generic fallback enricher.
- Produces: `createProductHuntEnricher(fallbackEnrich)` which returns `providerData: { upvoteCount: number }` for valid `/products/{slug}` API responses.

- [x] **Step 1: Write the failing backend tests**

```ts
const enrich = createProductHuntEnricher(async () => ({ title: "fallback" }));
const metadata = await enrich(new URL("https://www.producthunt.com/products/linear"), {
  env: { PRODUCT_HUNT_TOKEN: "product-hunt-token" },
  fetch: fetchApi,
});

expect(requestUrl.href).toBe("https://api.producthunt.com/v2/api/graphql");
expect(request.headers.get("Authorization")).toBe("Bearer product-hunt-token");
expect(metadata.providerData).toEqual({ upvoteCount: 1234 });
```

Also cover an unsupported `/posts/linear` URL, a missing token, GraphQL errors, and a null post; each must return the fallback result without attempting an API request when the path or token is invalid.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `bun test src/services/product-hunt-link-provider.test.ts`

Expected: FAIL because the Product Hunt enricher does not exist.

- [x] **Step 3: Implement the minimal Product Hunt API integration**

```ts
const response = await context.fetch(
  "https://api.producthunt.com/v2/api/graphql",
  {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "query ($slug: String!) { post(slug: $slug) { name tagline votesCount thumbnail { url } } }",
      variables: { slug },
    }),
    signal: controller.signal,
  },
);
```

Validate the hostname and exact `/products/{slug}` path before reading the token. Resolve the slug to the latest launch post through the API, then convert only a finite, non-negative `votesCount` to `providerData.upvoteCount`; use API name, tagline, and HTTPS thumbnail where valid. Time out after 2.5 seconds and call `fallbackEnrich(url, context)` for every invalid or failed result.

Register the enricher in `providerEnrichers`, add `PRODUCT_HUNT_TOKEN?: string` to `LinkProviderEnvironment`, and add the secret to Wrangler configuration and generated binding declarations.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `bun test src/services/product-hunt-link-provider.test.ts`

Expected: PASS.

- [x] **Step 5: Run backend static verification**

Run: `bun run --filter @sinabro/backend typecheck`

Expected: exit code 0.

### Task 2: Render Product Hunt upvotes in LinkAction

**Files:**
- Modify: `apps/frontend/src/components/grid/renderers/link.tsx:1-90,187-250,500-635`
- Modify: `apps/frontend/src/lib/grid/grid-demo-data.ts:6-75`

**Interfaces:**
- Consumes: `providerData.upvoteCount` written by Task 1.
- Produces: Product Hunt link actions whose visible content is a filled triangle icon, `Upvote`, and a compact count while retaining an accessible combined label.

- [x] **Step 1: Extend provider-count lookup and action props**

```ts
const countKey = {
  // existing mappings
  "product-hunt": "upvoteCount",
}[provider];

const linkActionProps = {
  label: provider === "product-hunt" ? "Upvote" : baseActionLabel,
  detail: providerCount,
  icon: provider === "product-hunt" ? Triangle : undefined,
  // existing presentation props
};
```

Import `Triangle` from `reicon-react`. Update `LinkAction` to accept the optional icon component, render it before the label with a compact non-interactive size, and retain `aria-label` as `Upvote 1.2K` rather than exposing decorative icon text.

Replace the local-only Product Hunt demo URL with `/products/sinabro` and seed
`providerData.upvoteCount: 1234` only for that demo item, so browser QA exercises
the new action without modifying persistent data.

- [x] **Step 2: Run focused frontend static checks**

Run: `bunx biome check src/components/grid/renderers/link.tsx && bun run --filter @sinabro/frontend typecheck`

Expected: both commands exit 0. No frontend test is added.

- [x] **Step 3: Verify the diff boundary**

Run: `git diff --check && git diff --stat`

Expected: only the Product Hunt provider, its test, Worker secret typing/configuration, link renderer, local-only provider demo data, and approved design/plan documents are changed.
