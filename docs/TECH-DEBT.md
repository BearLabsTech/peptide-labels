# Tech debt and known issues

Tracked **bugs, print-quality gaps, and fix-up work** — not product roadmap items (those live in [FRD.md](./FRD.md)).

When an item is fixed, move it to **Resolved** with a one-line note (date + what changed).

---

## Open

### Calculator state — separate authored inputs from derived values

**Priority:** Medium
**Status:** Partial — `CalculatorState = { authored, derived }` landed; `mergedInput` write-back is gone and label/compose paths read each half separately. Form handlers still sync derived values into the flat model via sequential `updateField` calls; the pure `calculatorReducer` (plan 2.5) and `SolveStrategy` registry (2.6) remain.

**Symptom:** `LabelModelInput` still persists some calculator results the assist/sync path writes back. A missed event transition can leave a stale derived field that downstream code must ignore or replace via `auto*` preference.

**When fixing:** Move calculator events behind one atomic reducer/transition boundary so derived values are never written into authored state. Inspect `useLabelForm.ts`, `calculatorAssistSync.ts`, and `calculatorModeSwitch.ts`.

---

### Preview fitting metrics — duplicated between TypeScript and CSS

**Priority:** Medium
**Status:** Open

**Symptom:** Font ratios, line height, border width, and section spacing used by `LabelLayoutEngine.ts` are mirrored in `LabelPreview.tsx` and `LabelPreview.css`. A visual-only CSS edit can make fit prediction disagree with preview/export.

**When fixing:** Define shared numerical typography metrics and expose the render-side values through CSS custom properties. Add an integration assertion around the smallest supported stock.

---

### Print catalog compatibility — two relation sources

**Priority:** Low
**Status:** Open — integrity tests now detect disagreement.

**Symptom:** Stocks list compatible printer IDs while printers separately list supported dimension IDs. New catalog entries require coordinated edits in both directions.

**When fixing:** Keep one canonical printer/stock compatibility relation in `printCatalog.ts` and derive reverse lookups used by `PrintCatalogFilter.ts`.

---

### Label render model — incomplete layout plan

**Priority:** Low
**Status:** Open

**Symptom:** Composition calculates column geometry but `LabelPreview.tsx` recomputes part of it from percentages and print-target facts. This keeps the renderer coupled to fitting policy.

**When fixing:** Include resolved `ColumnLayout` geometry in `LabelRenderModel` so preview/export render the completed composition plan directly.

---

### Print padding — exported PNG on Niimbot B21 (40×20 rounded stock)

**Priority:** High  
**Status:** Open — label stock profiles and reduced padding shipped; re-print test pending.

**Symptom:** Physical print had noticeably more white space than Niimbot editor/print preview, especially on the **left** (logo column).

**Shipped (Jun 2026):** Label stock selection (default **40×20 rounded**), unified per-stock padding (tighter on rounded), preview = export including corner clip, export DPI follows **selected printer** (skip/default **300 DPI**), capture targets label surface only.

**Still verify on hardware:** Niimbot rounded-template inset vs our padding; asymmetric left margin if it persists after re-print.

**Reference:** B21 phone test on `T40×20-320WHITE` rounded stock.

---

### Text print quality — raster export vs native Niimbot text

**Priority:** Medium (defer — follow up in a separate session/agent)  
**Status:** Open — **not a sizing issue**; typography/thermal output quality.

**Symptom:** Text from our **downloaded PNG** prints less cleanly than text typed directly in the Niimbot app on the same printer/stock. Visible in physical print photo (Jun 2026): edges look softer/blockier or less crisp than native Niimbot labels.

**Hypotheses to explore later:**

- `html-to-image` rasterization + browser font smoothing vs Niimbot’s native text renderer.
- Monochrome threshold step (`applyMonochromeThreshold`) — threshold, fattening grays to black.
- Niimbot **Contrast** slider (user often at 150) compensating differently for bitmap vs native text.
- Font stack (Arial in preview) at thermal resolution; subpixel/anti-aliasing artifacts.

**Out of scope for current padding/export-size work** unless a change clearly affects both.

---

### Compound name casing — do not default to all caps

**Priority:** Low  
**Status:** Open

**Symptom:** Compound name on the label is forced to uppercase (`LabelComposer` uppercases before layout; `LabelPreview.css` applies `text-transform: uppercase` on the title). Users may prefer mixed case as entered.

**When fixing:** Preserve user-entered casing in the model; reserve uppercase for section labels (RECONSTITUTION, PROTOCOL, etc.) and danger mode only if product agrees.

### Calculator default mode — two remaining hard-coded literals

**Priority:** Low
**Status:** Open

**Symptom:** After Phase 2 action 2.1 unified the resolver and UI on one `DEFAULT_CALCULATOR_SOLVE_MODE` constant, `calculatorGuards.ts:59` and `CalculatorView.tsx:59` still hard-code the literal `'target_units'` rather than importing the constant. Both already hold the correct value, so this is not a behavior bug — just a duplicated literal that could drift out of sync with the constant later.

**When fixing:** Replace both literals with an import of `DEFAULT_CALCULATOR_SOLVE_MODE`. Natural to fold into Phase 2's remaining actions (2.2-2.7) since they already touch these files.

---

## Resolved

### Title height weight constant — clamp makes most of its range dead

**Resolved:** 2026-08-02 (Phase 1 action 1.1). Replaced `Math.min(TITLE_HEIGHT_WEIGHT + 0.06, 0.55)` with a single named constant `TITLE_HEIGHT_WEIGHT_WITH_BODY = 0.55` and removed the unused base constant.
