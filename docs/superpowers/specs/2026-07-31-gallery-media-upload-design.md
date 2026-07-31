# Gallery media upload design

## Scope

Connect the page toolbar Gallery action to the existing page-item upload API,
persist uploaded media, and clean up R2 objects when persisted items are
deleted.

## Boundaries

- `Toolbar`: opens the native file picker, constrains the accepted extensions,
  rejects oversized/non-media files, and shows Toast feedback.
- `item-media-api`: performs presign, direct R2 PUT, and upload completion.
- `editor-store`: creates a local pending item with a blob preview, excludes
  pending items from autosave, and enables persistence only after completion.
- `item-media.service` and `core/r2`: own object-key construction and upload
  verification. Keys are `users/{userId}/{pageId}/{filename}`.
- `page-item.service`: validates page ownership of media keys and publishes
  deletion keys only after a successful DB transaction.
- Worker Queue consumer: deletes validated item-media objects asynchronously.
- Profile images are page-scoped at `users/{userId}/{pageId}/profile/{filename}`;
  legacy `users/profile/{filename}` values remain deletable during cleanup.

## Decisions

- The browser preview URL remains until the normal batch response replaces it
  with the public R2 URL. No extra URL replacement request is needed.
- The client checks the 3 MB limit before any API call; the server repeats the
  limit and MIME checks as the authority.
- `objectKey: "pending"` is local-only and is never sent to the batch API.

## Verification

- API, backend, and frontend type/check commands pass, with pre-existing
  frontend motion-CSS diagnostics reported separately.
- Backend tests cover the new page-scoped key and Queue validation.
- Development QA confirms picker behavior, oversized-file short circuit,
  preview creation, persisted objectKey, and deletion Queue publication.
