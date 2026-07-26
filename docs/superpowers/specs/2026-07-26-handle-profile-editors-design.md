# `$handle` profile editors design

## Scope

Add local-only editing controls for the page image, name, and bio on the
`/$handle` route. No update request or persistence is part of this change.

## Component boundaries

- `PageImageEditor` owns the hidden file input, the trigger button, and the
  local image preview. Its initial preview is the page image value.
- `EditableParagraph` renders a `p` element with `contentEditable` and keeps
  the edited text local to the component.
- `$handle.tsx` composes these components and passes page values into them.

## Layout behavior

The page content area remains a two-column layout. The right-hand `section`
gets a viewport-height, border-box minimum height and its own vertical scroll
container. Parent flex children use `min-height: 0` so the section's padding
and content do not force a page-level scrollbar.

## Verification

Run the frontend formatter/check and typecheck. Tests are not added because
`apps/frontend/AGENTS.md` explicitly excludes tests unless requested.
