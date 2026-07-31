# Gallery media upload implementation plan

1. Share the media size and accepted-extension contract and change item-media
   keys from item-scoped `bento` paths to page-scoped paths.
2. Pass the owned page ID through presign and completion, validate the exact
   owner/page prefix, and retain post-transaction Queue deletion.
3. Add the frontend upload client and connect Toolbar Gallery to a hidden file
   input with client-side size/MIME checks and Toast feedback.
4. Add pending-media editor-store operations so previews render immediately,
   pending data is not autosaved, and completed uploads are persisted with the
   real objectKey.
5. Run scoped checks and backend tests, then inspect the existing profile-image
   removal path and record its deletion boundary as a separate diagnosis.
