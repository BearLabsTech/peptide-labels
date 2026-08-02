# Tech debt and known issues

Tracked **bugs, print-quality gaps, and fix-up work** — not product roadmap items (those live in [FRD.md](./FRD.md)).

When an item is fixed, move it to **Resolved** with a one-line note (date + what changed).

---

## Open

### Calculator state — separate authored inputs from derived values

**Priority:** Medium
**Status:** Open — transition helpers and focused synchronization tests now reduce stale-state regressions; the state model still stores authored and calculated values together.

**Symptom:** `LabelModelInput` persists calculator inputs, generated results, and provenance flags in one broad optional-string model. A missed event transition can leave a stale derived field that downstream resolvers must ignore or replace.

**When fixing:** Move calculator events behind one atomic reducer/transition boundary, parse strings into one typed calculation draft, and derive `ResolvedLabelMath` once per state change. Inspect `useLabelForm.ts`, `calculatorAssistSync.ts`, `calculatorModeSwitch.ts`, and `LabelMathResolver.ts`.

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

---

### Title height weight constant — clamp makes most of its range dead

**Priority:** Low
**Status:** Open

**Symptom:** `TITLE_HEIGHT_WEIGHT` (`labelLayoutConstants.ts:6`, currently `0.5`) feeds `Math.min(TITLE_HEIGHT_WEIGHT + 0.06, 0.55)` in `LabelComposer.ts:129`. Any value of `0.49` or higher produces the same effective `0.55` — raising the constant further has no effect, and nothing about its definition signals this. Found via golden-test sensitivity verification during the code quality refactor (Phase 0): a deliberate mutation of this constant did not trip the golden tests until the change was large enough to also cross the danger-mode branch.

**When fixing:** Either raise the clamp ceiling to match the constant's intended range, or replace the pair with a single value plus an explicit named ceiling constant so the relationship is visible at the definition site instead of buried in the call site's arithmetic.

---

## Resolved

*(none yet)*
