# Pixel reference exports

Baseline PNG exports used to catch visual regressions that the numeric
`LabelComposer.golden.test.ts` snapshots cannot see — see Action 0.11 and the
phase exit checklist's "Pixel reference check" step in the active refactor
plan.

## Scope (deliberately reduced)

This folder holds a reference export for **one stock only: `40x20-rounded`**,
the app's recommended default. It does **not** cover the other five
`PRINT_CATALOG` stocks (`40x20-rect`, `40x30-rounded`, `40x30-rect`,
`50x30-rounded`, `50x30-rect`).

This was a deliberate decision, made during Phase 0, not an oversight or a
placeholder to fill in later: capturing a pixel reference requires driving
the real browser (manual field entry, then intercepting the PNG export's
`data:image/png;base64,...` download via CDP, since headless/automated
downloads aren't reliably retrievable). Doing that for six stocks, and
repeating it at every phase exit, was judged too time-consuming for the
marginal value over the numeric goldens, which already pin every
`LabelRenderModel` field for every stock. The accepted gap: a purely visual
regression (CSS or print-target math affecting rendered pixels without
changing any `LabelRenderModel` field) on a non-default stock would not be
caught by this check. Do not silently re-expand this scope to more stocks —
ask first if that gap ever needs closing.

## Files

- `40x20-rounded.png` — the reference image for the `40x20-rounded` stock.

## Input used

The "full label with all sections" scenario (same scenario used in the
`LabelComposer.golden.test.ts` matrix), entered manually via the app's UI at
`npm run dev`:

- Compound Name: `Tirzepatide`
- Compound Amount: `20 mg`
- Reconstitution: Manual Entry mode, `2 ml`, `BAC Water`, Reconstitution Date `06/21/2026`
- Protocol: Amount `5 mg`, Draw Volume `25` units, Frequency `Weekly`
- Test result indicators: enabled — Mass: Pass, Purity: Pass, LCMS: Not Run
- COA links: Vendor COA Link `https://example.com/coa`
- Source: Vendor Name `Bear Labs`, Group Buy `Group Buy Co`, Batch Number `BL-2026`, Batch Date `06/21/2026`
- Vial capacity: default `3 ml`
- Label stock: `40x20-rounded` (Print setup → Label stock)
- Printer: `Default (300 DPI export)`

## Generated

2026-08-03, quality follow-up action 7 (compound name printed as typed).

## Regenerating

1. Run `npm run dev` and open the label designer.
2. Enter the exact input above.
3. Click "Download Label PNG". Browser automation cannot reliably retrieve
   the download directly — instead inject a script to intercept the anchor
   click and capture the `data:image/png;base64,...` URL, write it to a text
   file, then decode it with
   `node scripts/decode-png-dataurl.cjs <input-file> <output-file>`.
4. Compare the new file against the one committed here. For a
   behavior-preserving phase, the bytes should be identical; if not, treat it
   as a bug per the phase exit checklist, not as "update the reference."
