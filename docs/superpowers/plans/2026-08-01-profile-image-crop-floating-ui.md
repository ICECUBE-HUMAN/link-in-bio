# Floating Profile Image Crop UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the centered profile-image crop dialog with an inline, absolutely positioned floating crop stage that preserves the existing image-pan/export/upload behavior.

**Architecture:** Keep `PageImageEditor` as the owner of committed image state, pending local preview, and upload persistence. Refactor `CropProfileImageDialog` into an anchored crop surface rendered inside the editor's positioned profile-image wrapper; its crop viewport stays at the existing profile-image bounds while the source image can extend and move behind it. Use the existing `motion/react` layout group for the open/close continuity and a local pending crop preview for the apply-to-resting-position handoff.

**Tech Stack:** React, TypeScript, `react-easy-crop`, `motion/react`, Tailwind classes, existing `RangeSlider`, `lucide-react` icons.

## Global Constraints

- Do not add frontend tests unless the user explicitly requests them.
- Keep the existing crop coordinate/export contract and backend upload flow unchanged.
- Crop movement must continue to move the image, not the crop viewport; zoom controls are intentionally omitted from this UI revision.
- The crop viewport remains 1:1 at the current profile-image position with a thicker black border.
- Only pixels outside the crop viewport receive a translucent white mask.
- Crop cancellation is performed by clicking outside the crop area; the existing Crop icon remains visible during editing and acts as Apply.
- The floating stage must be absolutely positioned and must not change surrounding layout.
- Apply must keep the cropped preview in the floating stage until the shared image settles back into the profile-image position.
- Respect `prefers-reduced-motion` and keep keyboard Escape/cancel behavior available.

---

### Task 1: Refactor the crop surface from modal to anchored floating stage

**Files:**
- Modify: `apps/frontend/src/components/page/crop-profile-image-dialog.tsx`
- Modify: `apps/frontend/src/components/page/page-image-editor.tsx`

**Interfaces:**
- `CropProfileImageDialog` receives the same crop source and initial crop data, plus the existing `layoutId` and callbacks; it no longer renders `Dialog`, `DialogContent`, backdrop, or modal footer chrome.
- `onApply` returns the parent-created pending preview URL so the crop surface can animate that exact result back to the profile image.

- [ ] Render the crop surface as an absolute stage centered over the profile-image wrapper, with a larger stage box and a fixed `cropSize` equal to the profile image frame so the crop viewport remains at the original position.
- [ ] Keep the source image draggable through `react-easy-crop`, retain aspect ratio 1, `restrictPosition`, zoom range, and `initialCroppedAreaPercentages`.
- [ ] Change the crop-area treatment to a visibly thicker black border and a translucent white `box-shadow` mask outside only the crop area; remove the dark full-screen overlay.
- [ ] Remove the separate cancel/apply control row; close on pointerdown outside the crop area and keep Escape as a keyboard escape path.
- [ ] Keep the existing Crop icon button visible while editing and route its click to the crop export/apply handoff.
- [ ] Add `rounded-lg` to the original crop media and use a 3px black crop border.
- [ ] Raise the crop stage's parent stacking context above staggered profile text so the image and Crop action hit-test above adjacent fields.
- [ ] Add reduced-motion behavior so open/close/apply uses opacity or an immediate position change without floating translation.
- [ ] Keep the crop source and editor state mounted until apply's short return transition completes; then invoke `onOpenChange(false)` so the existing layout id can land in the profile image trigger.

### Task 2: Preserve apply handoff and prevent layout shifts

**Files:**
- Modify: `apps/frontend/src/components/page/page-image-editor.tsx`

**Interfaces:**
- `handleCropApply(result)` returns the created object URL while continuing the existing upload promise and error rollback.

- [ ] Keep the editor's profile-image wrapper `relative` and render the crop stage as an absolutely positioned sibling so opening crop does not change document flow or surrounding grid layout.
- [ ] Do not close crop state before the crop surface has rendered the pending crop preview; allow the child to request close after its return transition.
- [ ] Keep `committedRef`, pending preview cleanup, source preview cleanup, and upload state behavior intact.
- [ ] Ensure changing/uploading/removing controls remain disabled while persistence is in progress and the landing transition does not briefly show the uncropped image.

### Task 3: Verify the UI contract with scoped static checks and manual QA

**Files:**
- No new test files.

- [ ] Run the frontend's existing typecheck/lint/build commands from `apps/frontend` without adding or running frontend tests.
- [ ] Inspect the rendered edit page: click Crop, confirm no surrounding layout shift, confirm the original image floats above the profile location, and confirm the crop frame stays at the original profile location.
- [ ] Drag and zoom the image; confirm the image moves while the black crop frame stays fixed and the outside-image mask is translucent white.
- [ ] Verify icon-only Cancel restores the committed image and Apply shows the cropped preview returning to the resting profile position before upload completion replaces it with the persisted URL.
- [ ] Verify keyboard focus, accessible names, Escape cancel, disabled apply while unavailable, and reduced-motion behavior.
