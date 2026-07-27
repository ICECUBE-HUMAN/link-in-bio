# Page and page-item service boundary design

## Goal

Keep page and page-item HTTP handlers thin while preserving the existing API contract and transaction behavior.

## Boundaries

- `controllers/page-items.controller.ts`: route registration, authentication lookup, JSON/schema parsing, HTTP response mapping.
- `controllers/pages.controller.ts`: route registration, authentication lookup, JSON/schema parsing, HTTP response mapping.
- `services/page.service.ts`: page ownership, current-page lookup, page creation, and page updates.
- `services/page-handle.service.ts`: handle normalization, reserved/invalid handle checks, and availability responses.
- `services/profile-image.service.ts`: profile-image upload URL creation, completion verification, replacement cleanup, and page update.
- `services/public-page.service.ts`: public page composition and response mapping.
- `services/page-item.service.ts`: page ownership lookup, item payload/layout validation, batch transaction, changed-item response data, and media cleanup key collection.
- `services/item-media.service.ts`: item-media key construction, upload URL creation, upload completion verification, public URL mapping, and cleanup key validation.
- `mappers/page.mapper.ts`: page persistence model to API response mapping.
- `core/r2.ts`: provider-neutral R2 signing and low-level key helpers.

Services may use the existing HTTP exception classes during this migration because the current error handler is Hono-based; no route or response contract changes are planned.

## Invariants

- Page ownership is checked before reading or mutating items.
- Batch mutations remain atomic.
- Media cleanup is published only after a successful transaction.
- Upload and completion endpoints keep their current schemas and status codes.
- Queue and scheduled handlers remain Worker entrypoint concerns.

## Verification

- Backend typecheck and tests pass.
- Existing controller route tests remain green.
- Service tests cover ownership, duplicate/conflicting IDs, media replacement cleanup, upload completion, and queue publication boundaries.
- API and frontend build checks remain green.
