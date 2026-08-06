# ADR: Adaptive label density

**Status:** Accepted  
**Date:** 2026-08-05

## Decision

Drive the title/body font search from a **structural ceiling** — the label height in export pixels (`mmToPx(labelHeightMm, dpi)`) — instead of a fixed low reference (26 px at 20 mm). After `TitleBodyFitter` finds a fit, redistribute any leftover vertical slack into per-box vertical padding via `computeBodyBoxVerticalPadPx`, carried on `LabelRenderModel.bodyBoxVerticalPadPx` so the preview only applies already-computed values.

## Rejected alternatives

- **Separate “nameplate” template for sparse labels.** Would fix empty-looking name-only stickers, but duplicates hierarchy logic and leaves sparse title+one-box cases half-fixed. One continuous adaptive algorithm covers every density without a mode switch.
- **Damping/cap constant on redistributed padding.** Slack is already `budget − used`; putting all of it back as padding cannot overflow the label. An arbitrary cap would be an unjustified magic number.
- **Width-based seed to shorten the downward font search.** A few hundred cheap string-fit iterations are negligible; optimizing the start size before evidence of slowness is speculative complexity.
- **Special-case branches inside `LabelLayoutEngine` / `TitleBodyFitter`.** Those search loops were already correct; only the ceiling fed into them was wrong.

## Why

Sparse labels were hitting an artificial font ceiling tuned for the densest case, so compound names stayed small in empty space. Raising the ceiling to real geometry lets existing fit checks bind; redistributing leftover height into box padding fills the sticker without new colors, gray fills, or a second layout mode — and stays monochrome-thermal friendly.

## Follow-up (same date)

Preview flex sizing was updated so the composed block (title band + optional main row) sizes to content and centers vertically when slack remains — title-only and title + short testing column no longer pin to the top. Logo present keeps fill-mode (`flex: 1`) so image `height: 100%` still resolves.

## Follow-up: sparse composition (same date)

The flex-fill / middle-out approach still looked wrong whenever body sections were absent: title and side content remained visually disconnected (top-left vs bottom-right) even when the group was mathematically centered. **Decision:** when there is no body content (`isSparse`), abandon the three-column row entirely and use a dedicated centered composition:

- Title + testing: title above a horizontal badge row (marks grow into the freed width).
- Title + logo: side-by-side, logo on an explicit height box (no `height: 100%` fill), title centered beside it; logo uses a generous width share.
- Title + logo + testing: logo left; title + horizontal badge row stacked on the right.

Dense labels (any reconstitution / protocol / source / demoted title) keep the existing three-column identity-header layout unchanged.

## Follow-up: text measurement port (same date)

Title growth was still blocked by a flat `charWidthEm` width estimate, not by height. Sparse badge marks were also double-capped (a title-relative height pre-cap plus ratio caps), and the title-to-badge gap was undersized. **Decision:** introduce a `TextMeasurer` port (canvas in production, heuristic in tests) — see [0009-text-measurement-port.md](./0009-text-measurement-port.md). Same change set: remove the solo-indicator height pre-cap, add `SPARSE_TITLE_TESTING_GAP_FRAC` shared by CSS and mm math.
