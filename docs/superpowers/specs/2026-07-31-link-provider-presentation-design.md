# Link Provider Presentation Design

## Goal

Give each supported link provider its own card background, CTA background, CTA text color, CTA label, and CTA style while keeping provider additions configuration-only.

## Architecture

`packages/api/src/link.ts` owns provider IDs, URL matching, and the provider-to-R2 icon object-key manifest because backend enrichment and frontend rendering share provider identity. `apps/frontend/src/lib/link/provider-presentation.ts` owns UI-only presentation values: hex colors, CTA copy, and solid/outline treatment. The link renderer resolves the provider once and applies the presentation object to the card fallback and `LinkAction`; it does not contain provider conditionals. During metadata enrichment, supported providers replace the initial DuckDuckGo favicon with the configured `R2_PUBLIC_URL` asset URL; unsupported providers retain their existing metadata behavior.

The presentation registry uses `satisfies Record<ConfiguredLinkProviderId, LinkProviderPresentation>` for the 21 configured providers. Providers outside the requested presentation list, including `generic-web`, `mailto`, and `notion`, keep their existing renderer styles. New styled providers require one API definition and one frontend presentation entry.

## Scope

- Add the 21 requested provider IDs and URL matchers.
- Add the requested card/CTA colors, CTA copy, and GitHub outline CTA variant.
- Add a development-only local demo set so all provider presentations can be inspected together.
- Keep actual UI colors out of the shared API package.
- Store provider icons in `test-images/assets/link-provider-icon/` and keep their object keys beside provider matching in the shared API package.
- Persist the R2 provider icon URL only when both the provider is supported and `R2_PUBLIC_URL` is configured.
- Preserve generic-web and mailto behavior with neutral fallback presentation.
- Do not add provider API integrations or frontend tests.

## Verification

- Run frontend Biome check and TypeScript typecheck.
- Confirm the presentation registry is exhaustive at compile time.
- Confirm the renderer has no provider-specific branch beyond generic-web action visibility.
- Open a handle with `?link-demo=providers` and confirm all 21 provider links render without persistence.
- Verify the 21 provider icon objects exist in `test-images` and are publicly readable through the configured R2 managed domain.
- Enrich a supported provider link and confirm the persisted/returned `metadata.faviconUrl` points to `test-images`, while an unsupported link keeps its existing favicon behavior.
