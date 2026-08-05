# SEO foundation implementation plan

1. Replace starter SEO constants and extend the shared metadata helpers with truncation, image alt metadata, and reusable profile JSON-LD.
2. Add complete homepage SEO metadata and mark placeholder/auth/editor routes with explicit noindex metadata.
3. Build dynamic public-handle metadata from loader data, including meaningful-content detection and profile structured data.
4. Remove dead starter routes from sitemap and llms.txt, and describe only routes that exist in the current frontend.
5. Run changed-file formatting/lint/type checks and the frontend production build; report any repository baseline diagnostics separately.
