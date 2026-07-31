# Link Metadata Enrichment Design

## Goal

Link submission must feel immediate while enriching metadata without blocking the initial grid update. A submitted link is first saved with deterministic local metadata, then the frontend automatically requests server-side metadata enrichment and replaces only that item when the response arrives.

## User flow

1. The toolbar accepts `https://`, host-like input without a protocol, and `mailto:`.
2. The frontend normalizes host-like input to `https://` before sending it.
3. `PATCH /pages/:handle/batch` persists the link item immediately. The backend adds deterministic initial metadata without network I/O:
   - HTTPS: a protocol-free URL label and a DuckDuckGo favicon URL.
   - `mailto:`: the email address as the label and no favicon.
4. The grid renders the acknowledged item immediately. The title and favicon are usable immediately; network-dependent description/image content uses Skeleton treatment while enrichment is pending.
5. The frontend automatically sends `POST /pages/:handle/metadata` with the item ID and URL. This request is not awaited before rendering the item.
6. The endpoint resolves a provider adapter, calls either a provider API or the generic HTML metadata fetcher, persists the result, and returns the updated item.
7. The frontend replaces the matching item with the endpoint response. There is no polling or Queue dependency.

## API and data contract

The link URL schema accepts HTTPS URLs and `mailto:` URLs. Favicon and OG image URLs remain HTTPS-only. Link metadata retains the canonical fields `title`, `description`, `faviconUrl`, and `imageUrl`; provider-specific data is extensible through an adapter result but is not required in the initial UI contract.

`POST /pages/:handle/metadata` accepts `{ itemId, url }`. The backend authenticates and verifies ownership through the page handle, requires the item to be a link, and only updates metadata if the stored URL still equals the submitted URL. Deleted or changed items therefore cannot receive stale enrichment results.

## Backend architecture

The metadata service is split into focused pieces:

- URL helpers: validate/normalize link URLs, derive the initial label, and construct the DuckDuckGo favicon URL.
- Provider contract and registry: providers match parsed URLs synchronously and expose an enrichment function. Registry order/priority lets specific providers override the generic provider.
- `mailto` provider: no network request.
- Generic web provider: bounded HTTPS GET with an abort timeout, HTML content-type/size guard, and extraction of title, description, and `og:image`.
- YouTube adapter: YouTube Data API v3 `channels.list`, the channel uploads playlist through `playlistItems.list`, and `videos.list` for video URLs. Channel metadata includes subscriber, video, and view counts plus the latest upload thumbnail.
- Twitch adapter: Helix `Get Users`, `Get Channel Followers`, `Get Streams`, and `Get Videos`. It uses an app token for public channel/stream/VOD data and a User Access Token with `moderator:read:followers` from the broadcaster or one of its moderators for follower data.
- CHZZK adapter: the official Open API `/open/v1/channels` and `/open/v1/lives` endpoints with `Client-Id` and `Client-Secret` headers. The official API does not expose a documented per-channel recent VOD/clips list, so private `/service/*` endpoints are intentionally excluded.
- Discord adapter: the public invite endpoint with `with_counts=true`, and Bot-authenticated channel/guild endpoints for Discord channel URLs. Discord channel URLs require `DISCORD_BOT_TOKEN`; invite counts do not.
- Metadata endpoint service: authorization, item lookup, provider selection, persistence, and response mapping.

Provider API credentials are passed from Worker bindings through the metadata context. If a provider credential is missing or an API request fails, the adapter falls back to the bounded generic OG metadata fetcher. Provider-specific values are returned through the existing scalar `providerData` record without adding provider-specific URL constants or default images.

## Failure and performance behavior

The initial batch never waits for an external URL. Enrichment uses a short timeout and degrades to the already-saved initial metadata when a fetch/provider call fails. A failed enrichment request does not delete or invalidate the link item. The frontend aborts an in-flight enrichment request when the page unmounts.

The generic fetch must not follow unbounded redirects, parse unbounded bodies, or treat non-HTML responses as page metadata. `mailto:` never reaches the generic fetcher.

## Verification

- Backend tests cover URL normalization, initial metadata, provider precedence, mailto no-fetch behavior, generic metadata extraction, stale URL protection, authorization, and external failure fallback.
- Frontend checks cover URL input behavior and type/lint/build; browser QA verifies immediate card display, Skeleton state, replacement after enrichment, paste submit, protocol insertion, and mailto handling.
- No frontend test files are added unless the user explicitly requests them.
