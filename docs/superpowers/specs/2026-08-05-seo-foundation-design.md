# SEO foundation design

## Context

The public-facing service is named `grabbin`. The frontend currently contains starter-template SEO values (`Cream`, `Service`, TanStack/blog references) and the generated sitemap/llms.txt refer to routes that do not exist in this checkout.

## Goals

- Make the landing page describe the product using its current category: a flexible link-in-bio page.
- Keep the product name configurable without inventing a brand name.
- Give public handle pages useful, server-rendered title, description, canonical, Open Graph, Twitter, and structured metadata.
- Prevent authentication, editor, placeholder, and demo surfaces from being indexed.
- Ensure sitemap and llms.txt contain only routes that exist in the current app.

## Decisions

1. Use `VITE_APP_TITLE` when configured to a non-starter value; otherwise use `grabbin` as the product name.
2. Use the homepage title and description to target the product intent (`link in bio`, `personal page`, `creator links`) without keyword stuffing.
3. Use the public page's name, bio, handle, and profile image for dynamic metadata. Use the page URL as canonical and add `ProfilePage` JSON-LD.
4. Mark `/log-in`, `/new`, `/explore`, `/update`, and `/demo` as `noindex, nofollow` until those surfaces contain intentional search content. Public user handles remain indexable when they have meaningful profile content.
5. Keep sitemap generation server-side and list only the indexable homepage. User handles are not enumerable from the current frontend contract, so they are not fabricated into the sitemap.
6. Keep `llms.txt` useful for the current app by describing the homepage and existing public utility pages; remove starter blog/legal references.

## Out of scope

- Choosing a final domain or social brand image.
- Adding a database-backed profile sitemap index.
- Writing frontend tests, per repository policy.
- Search Console submission or off-site link building.

## Acceptance criteria

- No public SEO output contains `Cream`, `TanStack Start Starter`, or `/blog`/`/privacy`/`/terms` links from this implementation.
- The homepage has a descriptive title, meta description, canonical URL, OG/Twitter metadata, and WebSite JSON-LD.
- A public handle page has a name fallback, description fallback, canonical URL, profile image metadata, and ProfilePage JSON-LD.
- Auth/editor/demo/placeholder routes are noindex.
- `/sitemap.xml` and `/llms.txt` return valid content referencing only current routes.
- Existing unrelated login-section work remains untouched.
