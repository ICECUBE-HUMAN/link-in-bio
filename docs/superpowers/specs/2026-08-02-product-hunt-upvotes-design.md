# Product Hunt Upvote Design

## Goal

Show the latest launch's current upvote total in the link action for only
`https://www.producthunt.com/products/{slug}` URLs. Medium is explicitly out of
scope.

## Scope and URL contract

- Accept `producthunt.com` and `www.producthunt.com` hosts with exactly one
  non-empty path segment after `/products/`.
- Resolve the Product Page slug to its latest launch post through the v2 API and
  use that launch's `votesCount`.
- Preserve generic metadata enrichment when the Product Hunt API is unavailable
  or returns no post.

## Data flow

1. The backend's Product Hunt provider extracts the Product Page slug from the accepted
   URL.
2. It sends a server-side `fetch` GraphQL request to Product Hunt using the
   `PRODUCT_HUNT_TOKEN` environment secret.
3. On a successful response, it returns API title, tagline, thumbnail when
   available and `providerData.upvoteCount` as a finite non-negative number.
4. The frontend recognizes that value only for the `product-hunt` provider and
   presents it in `LinkAction` as a filled upward triangle followed by
   `Upvote` and the compact number (for example, `Upvote 1.2K`).

## Failure behavior

- Missing token, network failure, non-2xx response, GraphQL errors, malformed
  JSON, null posts, and invalid counts must not fail link creation or updates.
- These cases return the existing generic metadata fallback without an upvote
  action detail.
- The token never reaches the browser or stored link metadata.

## Verification

- Backend tests cover accepted/rejected paths, GraphQL request and token header,
  successful metadata/count mapping, and API failure fallback.
- Do not add frontend tests. Run scoped backend tests and package typechecks;
  manually inspect the provider demo or a real `/products/{slug}` link after the
  token is configured.
