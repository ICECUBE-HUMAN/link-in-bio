# Link Provider Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configuration-driven card, CTA, and provider-icon presentation for all requested link providers.

**Architecture:** Keep shared provider matching and the provider-to-R2 object-key manifest in `packages/api/src/link.ts`; keep frontend-only colors, CTA copy, and CTA variant in an exhaustive presentation registry. Backend metadata enrichment composes the configured R2 public URL from the manifest. Renderers consume the registry without provider-specific styling branches.

**Tech Stack:** TypeScript, React, Tailwind-compatible class utilities, Biome.

## Global Constraints

- Provider UI colors and copy stay in the frontend package.
- Provider icon assets live in `test-images/assets/link-provider-icon/`.
- Every `LinkProviderId` must have a presentation entry.
- Generic web and mailto retain neutral fallback behavior.
- No frontend tests are added.

---

### Task 1: Expand shared provider IDs

**Files:**
- Modify: `packages/api/src/link.ts`

**Interfaces:**
- `LinkProviderId` includes all requested providers plus `generic-web` and `mailto`.
- `linkProviderDefinitions` matches each provider's primary hostname or protocol.

- [ ] Add the requested provider IDs and definitions while preserving priority ordering and generic fallback.
- [ ] Run `bun run --filter @sinabro/api check` if available, otherwise use the package's scoped check command.

### Task 2: Add frontend presentation registry

**Files:**
- Create: `apps/frontend/src/lib/link/provider-presentation.ts`

**Interfaces:**
- `getLinkProviderPresentation(value: string)` returns the provider ID.
- `linkProviderPresentation` is `satisfies Record<LinkProviderId, LinkProviderPresentation>`.

- [ ] Add card background, CTA background, CTA text, CTA label, and CTA variant for each provider.
- [ ] Add neutral configurations for `generic-web` and `mailto`.

### Task 3: Consume presentation in link renderer

**Files:**
- Modify: `apps/frontend/src/components/grid/renderers/link.tsx`

**Interfaces:**
- Card fallback consumes `cardBackground` and `cardText`.
- `LinkAction` consumes CTA background, text, label, and variant.

- [ ] Remove provider-specific fallback color mapping from the renderer.
- [ ] Apply registry values to preview fallback and action button.
- [ ] Preserve generic-web action visibility behavior.

### Task 4: Verify the scoped change

**Files:**
- No additional files.

- [ ] Run frontend `check` and `typecheck`.
- [ ] Inspect the diff for missing provider entries and unrelated changes.

### Task 5: Add local provider preview data

**Files:**
- Modify: `apps/frontend/src/lib/grid/grid-demo-data.ts`
- Modify: `apps/frontend/src/components/grid/grid-section.tsx`

**Interfaces:**
- `createLinkProviderDemoItems(items)` returns one local-only link item for each supported provider.
- `?link-demo=providers` enables the preview only in development builds.

- [ ] Add one representative URL for each of the 21 supported providers.
- [ ] Append the generated items to the rendered grid without changing persisted `items`.
- [ ] Keep the existing numeric `grid-demo` behavior unchanged.
- [ ] Verify with frontend typecheck/build; no frontend tests are added.

### Task 6: Migrate provider icons and use them during metadata enrichment

**Files:**
- Modify: `packages/api/src/link.ts`
- Modify: `apps/backend/src/core/r2.ts`
- Modify: `apps/backend/src/services/link-metadata.service.ts`
- Modify: `apps/backend/src/controllers/page-items.controller.ts`

**External resource:**
- Copy the required provider assets and remaining non-provider SVG assets from `umbrella/public/assets/link-provider-icon/` into `test-images/assets/link-provider-icon/`; omit `apple_email.png`.

- [ ] Keep the provider-to-object-key mapping in the shared provider module.
- [ ] Use `R2_PUBLIC_URL` for supported-provider favicon URLs during enrichment.
- [ ] Preserve DuckDuckGo/empty favicon behavior for providers without an R2 asset.
- [ ] Verify the supported-provider assets are publicly readable and run focused backend checks.
