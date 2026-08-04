# Link title read-mode line breaks design

## Goal

Make link-item titles render with the same meaningful line breaks in read mode that users see while editing, including the `landscape` (wide) preset.

## Scope

- Update the shared `LinkTitle` read-mode renderer in `apps/frontend/src/components/grid/renderers/link.tsx`.
- Do not synthesize ellipses or discard title content in read mode.
- Preserve `halfBanner` as a single-line layout because both its editor and viewer intentionally use a single line.
- Do not change stored link metadata, API payloads, or edit-mode textarea behavior.

## Design

The read-mode title element will use `white-space: pre-line` for every multi-line link preset (`squareSmall`, `landscape`, `squareLarge`, and `portrait`). Read mode will not use preset-specific line clamping, so explicit blank lines cannot turn into a standalone CSS ellipsis. If content exceeds the available title area, it will scroll inside the title region without showing a scrollbar. The class will be omitted for `halfBanner`, whose existing `truncate` behavior is intentional.

## Verification

- Compare edit and view modes for `landscape` with a title containing an explicit newline.
- Check `squareSmall`, `squareLarge`, and `portrait` for the same behavior.
- Confirm `halfBanner` remains single-line.
- Run the frontend's existing static validation/build command without adding frontend tests.
