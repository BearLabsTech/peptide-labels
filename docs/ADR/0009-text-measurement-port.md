# ADR: Text measurement port for layout fitting

**Status:** Accepted  
**Date:** 2026-08-05

## Decision

Replace the four hand-tuned `charWidthEm` heuristics (title, body, section labels, test badges) with a single `TextMeasurer` port:

- **Port:** `TextMeasurer` in `src/shared/ports.ts` — `measureWidthPx(text, fontPx, fontWeight)`.
- **Production adapter:** `CanvasTextMeasurer` in `src/platform` — offscreen canvas `measureText`, font family injected so the adapter never imports a feature module.
- **Deterministic default:** `HeuristicTextMeasurer` in `src/features/label/domain` — static narrow/medium/wide glyph groups; constructor default for `LabelLayoutEngine` / `LabelComposer` so unit tests and goldens stay free of browser APIs.
- **Wiring:** `useLabelComposer` injects `CanvasTextMeasurer(LABEL_FONT_FAMILY)` into production; views do not import `src/platform` directly.

Word wrapping uses a `fitsWidth` predicate backed by the same measurer — no parallel character-count estimate remains.

## Rejected alternatives

- **Sparse-only tighter `TITLE_CHAR_WIDTH_EM` constant.** Would paper over the binding width constraint for one composition mode while leaving dense titles and the other three inconsistent heuristics untouched; complicates future font changes.
- **Precomputed static glyph-width JSON table (e.g. one-shot browser measurement baked into the repo).** Accurate and deterministic, but stale whenever the font stack or weight changes; harder to evolve than live measurement.
- **Call `canvas.measureText` directly from `LabelLayoutEngine`.** Violates Humble Object / ports-and-adapters; would make goldens environment-dependent and conflict with “no browser-driven unit tests.”
- **Add `react-textfit` / shrink-to-fit DOM libraries.** Extra dependency for a job the engine already does; preview DOM is not the source of truth for export layout.

## Why

Title (and body) font search was often **width-bound**, not height-bound: a conservative flat em-per-character estimate capped size even when vertical space remained. Live canvas measurement reclaims that space safely, self-adapts if the font stack changes, and fits the existing ports/adapters pattern (same shape as `ImageProcessor` / `CanvasImageProcessor`). The heuristic default keeps CI and goldens deterministic.

## Consequences

- Golden snapshots for dense and sparse scenarios both move (expected: larger fitted fonts where the heuristic was over-conservative).
- Residual `widthSafety` (~0.98) remains only for subpixel / cross-browser rounding — not worst-case letter width.
- Hand-tuned width fractions (`TITLE_WIDTH_FRAC`, `SPARSE_TITLE_WIDTH_FRAC`, etc.) may be more conservative than necessary now that glyphs are measured; revisit tracked separately if needed.
- Physical print of long compound names still belongs in HUMAN-TASKS — browser measurement matches that browser; thermal output needs one hardware check.
