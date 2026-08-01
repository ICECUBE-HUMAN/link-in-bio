---
name: smooth-shadow-ring
description: Use when styling an elevated Tailwind surface in a project with shadow-plugin, especially when border-* or ring-* utilities are paired with shadow-*.
---

# Smooth shadow rings for elevated surfaces

## Overview

`shadow-plugin` provides elevation utilities whose edge and shadow render as one continuous stroke. Choose one of these utilities for a floating surface; do not stack a separate border or ring on the same element.

## Decision table

| Intent | Use | Do not add |
| --- | --- | --- |
| Elevation with a subtle hairline | `smooth-shadow-ring-{size}` | `border-*`, `ring-*` |
| Elevation without an edge stroke | `smooth-shadow-{size}` | `border-*`, `ring-*` |
| A tinted hairline | `smooth-shadow-ring-{size} smooth-ring-{color}` | a colored `border-*` or `ring-*` |
| A tinted shadow | add `shadow-{color}` | another shadow-size utility |

Available sizes are `xs`, `sm`, `md`, `lg`, `xl`, and `2xl`. The bare `smooth-shadow-ring` is also supported and follows the plugin's default size.

## Core pattern

Replace the edge-plus-shadow pair; do not make the border transparent as a workaround:

```html
<!-- Wrong: two independently painted edges -->
<div class="rounded-xl border border-neutral-200 shadow-md">…</div>

<!-- Right: one continuous edge and elevation -->
<div class="rounded-xl smooth-shadow-ring-md">…</div>

<!-- Right: no edge stroke -->
<div class="rounded-xl smooth-shadow-md">…</div>
```

For independent color tuning:

```html
<div class="rounded-xl smooth-shadow-ring-lg smooth-ring-black/10 shadow-blue-500">…</div>
```

The default ring is a low-alpha black hairline in light mode and a brighter white hairline in dark mode. Set `smooth-ring-{color}` explicitly when the surface is close in value to the page behind it or needs a deliberate theme tint.

## Scope and checks

Use this skill only when the project's Tailwind setup exposes the `smooth-shadow-*` utilities. Confirm the dependency/configuration before introducing them. If the plugin is unavailable, keep the project's existing shadow and border system rather than writing unsupported classes.

Before finishing a change:

- identify the element as an elevated surface;
- choose ring or no-ring intent;
- remove every `border-*` and `ring-*` utility from that same surface;
- keep unrelated layout, radius, background, and spacing classes unchanged.
