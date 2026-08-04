# Media Item Crop Implementation Plan

> **For agentic workers:** REQUIRED ORCHESTRATION: Execute this plan through the user-authorized `sol-advisor:orchestration` Luna task lane. Work task-by-task, preserve unrelated edits, and return concrete diff and verification evidence to the primary task.

**Goal:** Add preset-sized, breakpoint-specific crop editing and persistence for image and video media items without creating transformed R2 objects.

**Architecture:** Extend the shared media JSONB contract with optional normalized crop metadata for `wide` and `compact`. Use an item-scoped React context to connect the Crop button in `ItemControls` to direct pointer editing in `MediaItemRenderer`; applying a crop updates the existing grid editor draft and batch autosave. Render image and video sources from the original object using normalized absolute positioning.

**Tech Stack:** TypeScript, Valibot, Drizzle JSONB types, React 19, Tailwind CSS, React Grid Layout, Hono, Bun.

## Global Constraints

- The crop frame must exactly cover the current media item card and use the current preset's rendered size/aspect for the active breakpoint.
- While crop editing is open, reveal the entire scaled source outside the fixed frame and draw a `3px` black frame boundary, matching the profile-image crop interaction. Restore clipping when crop editing closes.
- Crop-open polish must remove `surface-line`, inherit the media card radius on both the revealed source and fixed frame, apply the profile crop's `smooth-shadow-lg` to the revealed source, and mask only the source area outside the frame with `rgb(255 255 255 / 0.35)`.
- Persist `crop.wide` and `crop.compact` independently as original-source percentages.
- Keep the original image/video R2 object; do not create crop raster or video variants.
- Support image and video with one crop contract and one geometry model.
- The first scope supports pointer drag only: no zoom, rotate, resize handles, or free-form ratio.
- Preserve legacy media rendering when `crop` is absent.
- Do not add frontend test files.
- Do not create a SQL migration: `page_items.data` is already JSONB.
- Preserve current upload, MIME/ownership validation, caption/link rendering, video autoplay/muted/loop/playsInline behavior, and response-only `mediaUrl` stripping.
- Do not commit, push, open a PR, merge, or modify unrelated files; the user has not authorized Git publication actions.
- Treat `docs/superpowers/specs/2026-08-04-media-item-crop-design.md` as the acceptance source.

---

## File Structure

- `packages/api/src/grid.ts`: normalized crop schema/type and media `crop` contract.
- `packages/api/src/index.ts`: backward-compatible profile crop aliases to the shared normalized crop contract.
- `apps/backend/src/db/schema.ts`: static JSONB data type reflecting the page-item data union.
- `apps/backend/src/controllers/page-items.controller.test.ts`: backend persistence and invalid-crop coverage.
- `apps/frontend/src/lib/grid/media-crop.ts`: pure crop initialization, aspect compatibility, clamping, and render-style helpers.
- `apps/frontend/src/components/grid/media-crop-interaction-context.tsx`: item-scoped open/cancel/apply registration and Escape/outside-click lifecycle.
- `apps/frontend/src/lib/grid/item-registry.ts`: media crop capability declaration.
- `apps/frontend/src/components/grid/item-controls.tsx`: Crop/Apply control rendering and interaction.
- `apps/frontend/src/components/grid/grid-item-shell.tsx`: media context boundary, control visibility, and conflicting action suppression.
- `apps/frontend/src/components/grid/renderers/media.tsx`: image/video metadata loading, preset-sized pointer crop, rendering, and update command.
- `apps/frontend/src/lib/grid/editor-store.ts`: include persisted crop in the batch payload.

---

### Task 1: Shared normalized crop and media JSONB contract

**Files:**
- Modify: `packages/api/src/grid.ts`
- Modify: `packages/api/src/index.ts`
- Modify: `apps/backend/src/db/schema.ts`
- Modify: `apps/backend/src/controllers/page-items.controller.test.ts`

**Interfaces:**
- Produces: `normalizedCropSchema`, `NormalizedCrop`, `pageItemMediaCropSchema`, and `PageItemMediaCrop` from `@sinabro/api/grid`.
- Preserves: `profileImageCropSchema` and `ProfileImageCrop` from `@sinabro/api` as aliases backed by the shared schema.
- Persists: `PageItemMediaData.crop?: { wide?: NormalizedCrop; compact?: NormalizedCrop }`.

- [ ] **Step 1: Extract the common normalized crop schema**

Add this contract near the breakpoint schema in `packages/api/src/grid.ts`:

```ts
export const normalizedCropSchema = v.pipe(
	v.object({
		x: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
		y: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
		width: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
		height: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
	}),
	v.check(
		({ x, y, width, height }) =>
			width > 0 && height > 0 && x + width <= 100 && y + height <= 100,
		"Crop area must stay within the source media.",
	),
);

export type NormalizedCrop = v.InferOutput<typeof normalizedCropSchema>;

export const pageItemMediaCropSchema = v.object({
	wide: v.optional(normalizedCropSchema),
	compact: v.optional(normalizedCropSchema),
});

export type PageItemMediaCrop = v.InferOutput<
	typeof pageItemMediaCropSchema
>;
```

- [ ] **Step 2: Extend media request and response data**

Add `crop: v.optional(pageItemMediaCropSchema)` to `pageItemMediaDataSchema`. Because `pageItemMediaResponseDataSchema` spreads the request entries, crop must be accepted in both upsert and response parsing without adding a second field.

- [ ] **Step 3: Preserve the profile API surface**

Replace the duplicated profile crop declaration in `packages/api/src/index.ts` with aliases:

```ts
export const profileImageCropSchema = grid.normalizedCropSchema;
export type ProfileImageCrop = grid.NormalizedCrop;
```

Do not rename existing profile request/response properties.

- [ ] **Step 4: Refine the Drizzle JSONB static type**

Import `PageItemUpsert` alongside `ProfileImageCrop` and change the `pageItems.data` type from `Record<string, unknown>` to `PageItemUpsert["data"]`. This is a TypeScript-only change; do not generate a Drizzle migration.

- [ ] **Step 5: Add backend crop persistence coverage**

Extend `apps/backend/src/controllers/page-items.controller.test.ts` with one valid media batch case containing distinct `wide` and `compact` crop values. Assert the request succeeds and the stored/returned media data contains the same crop object. Add one invalid case such as `x: 80, width: 30` and assert HTTP `422` with no persisted mutation.

- [ ] **Step 6: Verify the contract layer**

Run:

```bash
bun run --filter @sinabro/api check
bun run --filter @sinabro/backend test
bun run --filter @sinabro/backend check
```

Expected: all commands exit `0`; backend tests include valid persistence and invalid normalized-crop rejection.

---

### Task 2: Preset-sized crop geometry helpers

**Files:**
- Create: `apps/frontend/src/lib/grid/media-crop.ts`

**Interfaces:**
- Consumes: `NormalizedCrop` from `@sinabro/api/grid`.
- Produces:
  - `type MediaSize = { width: number; height: number }`
  - `getCenteredMediaCrop(sourceSize, frameSize): NormalizedCrop`
  - `isMediaCropAspectCompatible(crop, sourceSize, frameSize, tolerancePx?): boolean`
  - `moveMediaCrop(crop, deltaX, deltaY, frameSize): NormalizedCrop`
  - `getMediaCropStyle(crop): CSSProperties`

- [ ] **Step 1: Implement centered cover crop calculation**

Use source and frame aspect ratios. When the source is wider than the frame, retain `height: 100` and center a reduced width. When the source is narrower, retain `width: 100` and center a reduced height.

```ts
const sourceAspect = sourceSize.width / sourceSize.height;
const frameAspect = frameSize.width / frameSize.height;
```

Return percentages in source coordinates, not pixels.

- [ ] **Step 2: Implement aspect compatibility**

Calculate the effective crop aspect in source pixels:

```ts
const cropAspect =
	(sourceSize.width * (crop.width / 100)) /
	(sourceSize.height * (crop.height / 100));
```

Compare it with `frameSize.width / frameSize.height` using a small pixel-equivalent tolerance. An incompatible persisted crop must not stretch into a newly selected preset.

- [ ] **Step 3: Implement pointer movement clamping**

Map frame-space pointer deltas back to source percentages:

```ts
const x = clamp(
	crop.x - (deltaX / frameSize.width) * crop.width,
	0,
	100 - crop.width,
);
const y = clamp(
	crop.y - (deltaY / frameSize.height) * crop.height,
	0,
	100 - crop.height,
);
```

Keep `width` and `height` unchanged during drag.

- [ ] **Step 4: Implement absolute media style**

Return the normalized style used by both image and video:

```ts
return {
	position: "absolute",
	maxWidth: "none",
	width: `${(100 / crop.width) * 100}%`,
	height: `${(100 / crop.height) * 100}%`,
	left: `${(-crop.x / crop.width) * 100}%`,
	top: `${(-crop.y / crop.height) * 100}%`,
};
```

- [ ] **Step 5: Verify the helper statically**

Do not add a frontend test file. Run:

```bash
bunx biome check apps/frontend/src/lib/grid/media-crop.ts
bun run --filter @sinabro/frontend typecheck
```

Expected: both commands exit `0`.

---

### Task 3: Item-scoped crop interaction and controls

**Files:**
- Create: `apps/frontend/src/components/grid/media-crop-interaction-context.tsx`
- Modify: `apps/frontend/src/lib/grid/item-registry.ts`
- Modify: `apps/frontend/src/components/grid/item-controls.tsx`
- Modify: `apps/frontend/src/components/grid/grid-item-shell.tsx`

**Interfaces:**
- Produces `MediaCropInteractionProvider`, `useMediaCropInteraction()`, and `useOptionalMediaCropInteraction()`.
- Context values: `isOpen`, `open()`, `cancel()`, `applyRequestRef`, and optional `isDragging`/setter only if needed for shell behavior.
- Adds capability command `crop-media` only for renderable media items in edit mode.

- [ ] **Step 1: Create the media crop interaction context**

The provider owns only ephemeral UI state. It must:

- expose `open()` and `cancel()`;
- expose a mutable apply callback ref registered by the renderer;
- cancel on Escape;
- cancel on pointer down outside the current `[data-grid-item-id]` shell;
- clean up document listeners and the callback ref on close/unmount.

Do not put persisted crop data in this context.

- [ ] **Step 2: Register the media capability**

Extend `GridItemControlCommand` with `"crop-media"`. In `getItemCapabilities`, add this control for `item.type === "media"`, `context.mode === "edit"`, and `canRender`.

```ts
controls.push({
	command: "crop-media",
	label: "Crop media",
});
```

Place it after preset controls and before link management.

- [ ] **Step 3: Render Crop/Apply in ItemControls**

Use Lucide `CropIcon`. The button must:

- call `open()` while closed;
- call `applyRequestRef.current?.()` while open;
- switch its accessible label between `Crop media` and `Apply media crop`;
- expose `aria-pressed={isOpen}`;
- remain an icon-sized toolbar control;
- keep existing link and preset controls intact.

Account for this control in `controlsWidth` and separator logic rather than using hard-coded overlay positioning.

- [ ] **Step 4: Add the provider boundary in GridItemShell**

Wrap media items in `MediaCropInteractionProvider`, analogous to the existing map provider. While crop is open:

- keep floating controls visible;
- suppress the delete button;
- release overflow clipping only for the active media card so the full scaled source is visible outside the fixed preset frame;
- keep the active React Grid Layout item above siblings while crop is open;
- let the renderer's crop surface cancel RGL dragging through the existing drag-cancel selector.

- [ ] **Step 5: Verify control integration**

Run:

```bash
bunx biome check \
  apps/frontend/src/components/grid/media-crop-interaction-context.tsx \
  apps/frontend/src/lib/grid/item-registry.ts \
  apps/frontend/src/components/grid/item-controls.tsx \
  apps/frontend/src/components/grid/grid-item-shell.tsx
bun run --filter @sinabro/frontend typecheck
```

Expected: both commands exit `0`; no frontend test files are created.

---

### Task 4: Image and video direct crop renderer

**Files:**
- Modify: `apps/frontend/src/components/grid/renderers/media.tsx`

**Interfaces:**
- Consumes: active `breakpoint`, `preset`, `onCommand`, media crop context, and helpers from Task 2.
- Produces: `update-data` with only the active breakpoint crop replaced.

- [ ] **Step 1: Track source and frame sizes**

- Read image natural dimensions from `event.currentTarget.naturalWidth/naturalHeight` in `onLoad`.
- Read video dimensions from `event.currentTarget.videoWidth/videoHeight` in `onLoadedMetadata`.
- Measure the renderer root with `ResizeObserver`; this rendered bounding box is the exact current preset frame.
- Reset/cancel the current crop edit when `breakpoint`, `preset`, media source, or item ID changes.

- [ ] **Step 2: Resolve persisted versus centered crop**

For the active breakpoint:

1. Use `item.data.crop?.[breakpoint]` only when source/frame metadata exists and `isMediaCropAspectCompatible` returns true.
2. Otherwise use `getCenteredMediaCrop(sourceSize, frameSize)` as the temporary display/edit crop.
3. When crop is absent and editing is closed, retain the original `object-cover` path to preserve legacy visuals.

- [ ] **Step 3: Implement pointer drag**

On the crop surface:

- set `data-grid-item-drag-cancel="true"`;
- require edit mode, open context, and source/frame metadata;
- capture the pointer on down;
- retain pointer ID, start coordinates, and starting crop in a ref;
- update draft crop with `moveMediaCrop` on move;
- release/reset the ref on pointer up or cancel;
- use `touch-none` and `cursor-grab`/`cursor-grabbing` only while editing.

- [ ] **Step 4: Register Apply and render both media types**

Register an apply callback with the context:

```ts
onCommand?.({
	type: "update-data",
	itemId: item.id,
	data: {
		...item.data,
		crop: {
			...item.data.crop,
			[breakpoint]: draftCrop,
		},
	},
});
```

Close the interaction after updating the local editor draft. The existing autosave status remains the persistence/error indicator, and the crop stays in the local draft if the batch later fails.

Apply the same `getMediaCropStyle` result to `<img>` and `<video>`. Preserve video `autoPlay`, `muted`, `loop`, and `playsInline`; preserve caption and external-link layers. Disable caption/link pointer interaction only while crop is open so drag owns the card surface.
When crop is open, make the renderer overflow visible so the single original media element is revealed outside the card without duplicating video playback. Size the interaction overlay to the complete revealed source, give it an overriding `grab`/`grabbing` cursor, and keep `data-grid-item-drag-cancel="true"` so pointer events cannot fall through to overlapping grid items. Render the fixed preset-sized `3px` black frame as a separate pointer-events-none layer. Closed/view rendering remains clipped.
Render one pointer-events-none mask clipped to the revealed source rectangle, with a transparent rounded crop hole created by an oversized pale-white box shadow. This must mask the four corners outside the rounded black frame, inherit the card radius on the source and frame, and remove `surface-line` only while crop is open. Wrap the media and mask in a profile-crop-timed `400ms` inset clip-path reveal, while keeping `smooth-shadow-lg` on an outer wrapper so the animation does not clip the shadow.

- [ ] **Step 5: Verify renderer statically**

Run:

```bash
bunx biome check apps/frontend/src/components/grid/renderers/media.tsx
bun run --filter @sinabro/frontend typecheck
bun run --filter @sinabro/frontend build
```

Expected: all commands exit `0`.

---

### Task 5: Batch serialization and end-to-end verification

**Files:**
- Modify: `apps/frontend/src/lib/grid/editor-store.ts`
- Inspect: all files changed by Tasks 1–4

**Interfaces:**
- Preserves response-only stripping of `mediaUrl`.
- Adds `crop: data.crop` to media batch data.

- [ ] **Step 1: Serialize crop in media upserts**

Update the media branch of `toBatchItem()`:

```ts
data: {
	objectKey: data.objectKey,
	mimeType: data.mimeType,
	caption: data.caption,
	link: normalizeItemLink(data.link),
	crop: data.crop,
},
```

Do not send `mediaUrl`. Do not change the pending-item filter or upload completion behavior; `updateMediaUpload()` already spreads existing media data and therefore preserves crop.

- [ ] **Step 2: Run all focused checks**

Run:

```bash
bun run --filter @sinabro/api check
bun run --filter @sinabro/backend test
bun run --filter @sinabro/backend check
bun run --filter @sinabro/frontend typecheck
bun run --filter @sinabro/frontend build
```

Expected: every command exits `0`. If a broad frontend check reports known unrelated baseline diagnostics, record them separately and run Biome against every changed frontend file.

- [ ] **Step 3: Run manual browser verification**

Verify the design scenarios in `docs/superpowers/specs/2026-08-04-media-item-crop-design.md`:

- image crop Apply and reload persistence;
- video crop Apply while playback attributes remain active;
- independent `wide` and `compact` crop values;
- crop frame bounding box equals the current preset card bounding box;
- active crop reveals the full original outside the card while the fixed frame has a `3px` black border;
- crop-open source/frame inherit card rounding, the outside source is masked pale white, and `surface-line` is absent;
- the full revealed source is the crop hit surface, reports a `grab` cursor, and blocks hover/click/drag on overlapping grid items behind it;
- crop activation reveals the source with the profile-image crop's `400ms` duration and easing;
- preset change uses a centered temporary crop until Apply;
- Cancel, Escape, and outside click cause no crop batch mutation;
- pending upload crop survives `updateMediaUpload` completion;
- legacy media without crop remains centered `object-cover`.

Capture visible behavior plus the relevant PATCH request payload/response. Do not claim browser success from static checks alone.

- [ ] **Step 4: Inspect final scope**

Run:

```bash
git status --short --branch
git diff --check
git diff --stat
git diff
```

Expected: only the files listed in this plan are changed; no migration, frontend test, lockfile, generated route, PR, push, or commit is created.
