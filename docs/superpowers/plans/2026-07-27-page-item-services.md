# Page and page-item service extraction plan

## Scope

Extract business logic from `pages.controller.ts` and `page-items.controller.ts` into domain-oriented services without changing routes or API payloads.

## Units

1. Add `services/page.service.ts` and move page ownership, current-page lookup, creation, and update behavior.
2. Add `services/page-handle.service.ts`, `services/profile-image.service.ts`, and `services/public-page.service.ts` for handle, profile-image, and public-page flows.
3. Add `mappers/page.mapper.ts` and centralize page persistence-to-response mapping.
4. Add `services/item-media.service.ts` and move item upload/completion/public URL behavior behind explicit service functions.
5. Add `services/page-item.service.ts` and move page ownership, item validation, batch persistence, and cleanup-key collection.
6. Reduce both controllers to HTTP orchestration and run backend/API/frontend verification.

## Acceptance criteria

- The controllers contain no Drizzle transaction or R2 metadata logic.
- Services do not depend on Hono route objects.
- Existing endpoints and status codes remain unchanged.
- `bun run --filter @sinabro/backend check` passes.
- `bun run --filter @sinabro/backend test` passes.
- `bun run --filter @sinabro/api check` and frontend build pass.
