# Tech debt and known issues

Tracked **bugs, print-quality gaps, and fix-up work** — not product roadmap items (those live in [FRD.md](./FRD.md)).

When an item is fixed, move it to **Resolved** with a one-line note (date + what changed).

---

## Open

### Calculator state — separate authored inputs from derived values

**Priority:** Medium
**Status:** Partial (updated 2026-08-02, Phase 2 closed) — Phase 2 actions 2.1–2.7 are complete: `CalculatorState = { authored, derived }` landed; `mergedInput` write-back is gone; pure `calculatorReducer` + frozen `SolveStrategy` registry live under `domain/`; identifiers match COPY-GUIDELINES vocabulary (`compoundAmount`, `protocolAmount`, `protocolUnits`, `syringeCapacityMl`). `useLabelForm.ts` is `useReducer` plus dispatch wrappers.

What remains (deferred past Phase 2): recommended/system-generated values (a fresh target concentration, draw-units label, or recomputed water) are still written back into the same flat `LabelModelInput` fields a user types into (`targetConcentration`, `protocolUnits`, `reconstitutionAmount`, `concentration`), distinguished only by a `*Origin: 'recommended' | 'user'` provenance flag rather than a type-level separation. Closing this fully would mean those recommendations live in `derived` instead and are never assigned into the authored fields at all.

**Symptom:** `LabelModelInput` still persists some calculator results the assist/sync path writes back, tagged with provenance rather than kept structurally separate.

**When fixing:** Move the `recommended`-origin fields (target concentration, draw units, assist water/concentration) out of `LabelModelInput` and into `derived`/`CalculatorState`, so a `SolveStrategy` can no longer write a recommended value into an authored field at all — only `Provenance`-tag it today. Inspect `domain/solveStrategy.ts`'s three implementations and `calculatorModeSwitch.ts`'s `Provenance<T>`/`protocolUnitsPatch`/`targetConcentrationPatch` helpers.

---

### Shared print module still imports label vial capacity

**Priority:** Low
**Status:** Open — discovered at Phase 4 exit (2026-08-03).

**Symptom:** After moving `print/` to `src/print/`, several print modules still import `normalizeVialCapacityMl` / `DEFAULT_VIAL_CAPACITY_ML` / `VialCapacityMl` from `src/features/label/vialCapacity.ts`. Shared infrastructure depending on a feature module is the wrong direction and will conflict with Phase 7 layer lint (`src/print` should not reach into `features/label`).

**When fixing:** Move vial-capacity types and normalize helpers into `src/print/` (or a small shared domain module both print and label depend on). Touch `print/types.ts`, `print/defaults.ts`, `print/printStorage.ts`, `print/PrintTargetResolver.ts`.

**Standard:** CODE-QUALITY.md section A / F — module boundaries and dependency direction.

---

### Print catalog compatibility — two relation sources

**Priority:** Low
**Status:** Open — integrity tests now detect disagreement.

**Symptom:** Stocks list compatible printer IDs while printers separately list supported dimension IDs. New catalog entries require coordinated edits in both directions.

**When fixing:** Keep one canonical printer/stock compatibility relation in `printCatalog.ts` and derive reverse lookups used by `PrintCatalogFilter.ts`.

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

## Resolved

### Preview fitting metrics — duplicated between TypeScript and CSS

**Resolved:** 2026-08-02 (Phase 3 action 3.5). All seven mirrored metrics (section-label/content font ratios, content line-height, box border width, box vertical padding, box gap, title line-height) now live in one `LABEL_TYPOGRAPHY` object in `labelTypography.ts`. `LabelLayoutEngine.ts` and `qrRenderSize.ts` compute from it directly; `LabelPreview.tsx` emits it onto the label container as CSS custom properties (`labelTypographyCssVars`, using the `cssVars` helper); `LabelPreview.css` consumes `var(--label-section-label-em)` and equivalents instead of hardcoded literals. `labelTypography.test.ts` asserts every emitted custom property's value and unit match the constant it mirrors. The box's 0.8cqw horizontal padding stays a plain CSS literal — the engine only ever modeled the vertical padding for its height estimate, so no matching constant was invented for it.

### Label render model — incomplete layout plan

**Resolved:** 2026-08-02 (Phase 3 action 3.4). `LabelRenderModel` now carries resolved `columnLayout` and `identityHeaderTitleBreakout`; `LabelPreview` reads them and no longer imports `labelColumnLayout`.

### Calculator default mode — two remaining hard-coded literals

**Resolved:** 2026-08-02 (Phase 2 exit). `LabelDesignerView` example input and `TargetUnitsSolve` now import `DEFAULT_CALCULATOR_SOLVE_MODE` instead of hard-coding `'target_units'` for defaults/identity. Remaining `'target_units'` literals are intentional mode discriminators (comparisons, fixtures, registry keys), not duplicate defaults.

### Title height weight constant — clamp makes most of its range dead

**Resolved:** 2026-08-02 (Phase 1 action 1.1). Replaced `Math.min(TITLE_HEIGHT_WEIGHT + 0.06, 0.55)` with a single named constant `TITLE_HEIGHT_WEIGHT_WITH_BODY = 0.55` and removed the unused base constant.
