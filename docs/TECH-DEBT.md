# Tech debt and known issues

Tracked **bugs, quality gaps, and fix-up work that an agent can close** — not product roadmap items (those live in [FRD.md](./FRD.md)), and not work that needs a person or physical hardware to verify (that lives in [HUMAN-TASKS.md](./HUMAN-TASKS.md)).

Every item here should be closeable by reading, changing, and testing code. If closing an item would require printing a label, judging output by eye, or a decision only the product owner can make, it belongs in `HUMAN-TASKS.md` instead — mixing the two makes this list look permanently unfinishable.

When an item is fixed, move it to **Resolved** with a one-line note (date + what changed).

---

## Open

### `DEFAULT_DRAW_UNITS_PER_MG` still means three different things

**Symptom:** One constant is used as a default rate, a placeholder display value, and (with `DEFAULT_DRAW_UNITS_PER_MG_REDUCED`) a scaling basis — easy to change the wrong meaning.

**Priority:** Low.

**Where to look / hypotheses:**
- `src/features/label/peptideMath.ts` — display path ~190, scale path ~350.
- Split into named constants per role when next touching draw-unit defaults. Do not change golden-facing math without characterization.

### Residual `vialMl` fallbacks beside `vialCapacityMl`

**Symptom:** `selection.vialCapacityMl ?? selection.vialMl` (and print-selection equivalent) still appear in two call sites after the capacity rename.

**Priority:** Low.

**Where to look / hypotheses:**
- `src/print/PrintCatalogFilter.ts`, `src/features/customDesign/useApplyDesignViewModel.ts`.
- Remove when callers always set `vialCapacityMl`, or keep one documented compatibility read until storage migrations guarantee the new field.

### Silent numeric coercion / error-convention convergence

**Symptom:** `parseNumericField` and related `Number(…) || 0` (and similar) sites turn invalid input into `0`, so callers cannot tell empty from zero from garbage. Result vs throw conventions are also uneven across parse/export/storage boundaries.

**Priority:** Medium.

**Where to look / hypotheses:**
- Inventory lives in the pre-complexity sweeps plan Deferred section and in `docs/reviews/2026-08-04-pre-complexity-sweeps-closeout.md`.
- Own implementation in a dedicated **error-convention** plan — do not piecemeal-fix during unrelated work.

### Consider adding `eslint-plugin-jsx-a11y`

**Symptom:** accessibility rules are not enforced by lint. The concrete missing `aria-describedby` on the image upload was fixed by hand in 2026-08-04 (pre-complexity action 6); a plugin would catch the next one. Per plan D5 this is a new dependency and needs an explicit go-ahead.

**Priority:** Low.

**Where to look / hypotheses:**
- Ask before adding `eslint-plugin-jsx-a11y` (or the flat-config equivalent) to `eslint.config.js`.
- Wire recommended rules for `src/**/*.tsx` only; components are already humble and not unit-tested, so lint is the main a11y gate.

### The `**/*.tsx` import ban cannot fire, so JSX purity is unenforced

**Symptom:** the purity blocks in `eslint.config.js` (both the pre-existing `src/**/domain/**` one and the label math/composition one added 2026-08-04) include a `patterns` entry banning `**/*.tsx`. That pattern matches the **import specifier string**, and TypeScript imports omit the extension — real code writes `from './LabelPreview'`, never `from './LabelPreview.tsx'`. Verified 2026-08-04 with a probe module importing `./LabelPreview` from `src/features/label/`: no error was reported.

**Priority:** Low. The adjacent rules do the load-bearing work — React **values** and `src/platform` imports are both correctly blocked and proven to fire, and a `.tsx` module that pulled in React would be caught by the React ban at its own layer. This is a rule that looks like enforcement without being it, not a live purity hole.

**Where to look / hypotheses:**
- `eslint.config.js` — the `group: ['**/*.tsx']` entries in the label purity block and the `src/**/domain/**` block.
- Options: drop the dead pattern and rely on the React-value ban; or replace it with something specifier-based that can actually match, such as banning the directories that hold components (`**/components/**`) from pure modules, after checking no pure module legitimately imports one.
- Whichever way it goes, prove the replacement fires with a probe module before trusting it.

---

---

## Resolved

### Compound name casing — do not default to all caps

**Resolved:** 2026-08-03. Compound name prints as typed (`titleLines` no longer uppercases; `.label-preview-title` no longer forces `text-transform: uppercase`). Section labels, danger title, and QR captions remain uppercase.

### View-model components still over the ~120-line soft budget

**Resolved:** 2026-08-03. Split presentation-only JSX: `ApplyDesignLibrarySection` from `ApplyDesignView`; `PrintSetupCatalogStockPanel` and `PrintSetupCustomDimensionsPanel` from `PrintSetupSection`. View-model hooks untouched. Accepted as-is (markup volume, not complexity): `CalculatorView`, `FormInputs`, `SidebarSections`, `LabelPreview` — documented in CODE-QUALITY.md section A.

### Calculator state — separate authored inputs from derived values

**Resolved:** 2026-08-03. Authored draw volume and target concentration now live separately from strategy recommendations in `protocolUnits` / `targetConcentration` and `recommendedProtocolUnits` / `recommendedTargetConcentration`. The origin flags are deleted, regeneration checks the authored slots directly, and reducer invariants prevent conflicting paired values. Calculator state is in-memory only and required no persistence migration.

### Solve-mode branching still lives outside the SolveStrategy registry

**Resolved:** 2026-08-03. Display precedence, field visibility, required-water math, and cross-mode entry flags now route through `SOLVE_STRATEGIES` members (`waterIsDerived`, `drawUnitsAreDerived`, `authoritativeField`, `requiredWaterMl`, `outgoingWaterFollowsDrawUnits`).

### mg/IU draw-units disagree below 1 unit

**Resolved:** 2026-08-03. Both branches of `calculateDefaultDrawUnits` now report the honest fractional value. Tiny protocols (e.g. 3 mcg → 0.03 units) can show sub-1 unit recommendations; that is intentional per product decision.

### Print catalog compatibility — two relation sources

**Resolved:** 2026-08-03. Deleted `LabelStock.printerIds`; renamed `Printer.labelIds` → `dimensionIds`. Stock↔printer compatibility is now derived from `printer.dimensionIds.includes(stock.dimensionId)` only.

### LabelPreview.css keeps stale-prone fallback literals for typography custom properties

**Resolved:** 2026-08-03. Removed the seven `var(--label-*, <literal>)` fallbacks from `LabelPreview.css` so a missing custom property fails visibly instead of silently using a stale number. Left the seven `--label-pad` fallbacks alone — different variable, not a `LABEL_TYPOGRAPHY` mirror.

### Reducer accepts a measure unit its vial unit cannot pair with

**Resolved:** 2026-08-03. `MeasureUnitChanged` now rejects via `makeUnitWorld` the same way an unparseable unit is rejected. Permanent sweep in `calculatorReducer.invariants.test.ts` (4,732 length-2 transitions) pins pairing, no-NaN, and idempotence.

### Shared print module still imports label vial capacity

**Resolved:** 2026-08-03 (Phase 7 action 7.1). Vial-capacity types and helpers live in `src/print/vialCapacity.ts`; print modules import them locally. `src/features/label/vialCapacity.ts` is a thin re-export for label UI. Layer lint (`no-restricted-imports`) now forbids feature↔feature and domain→platform cross-imports.

### Preview fitting metrics — duplicated between TypeScript and CSS

**Resolved:** 2026-08-02 (Phase 3 action 3.5). All seven mirrored metrics (section-label/content font ratios, content line-height, box border width, box vertical padding, box gap, title line-height) now live in one `LABEL_TYPOGRAPHY` object in `labelTypography.ts`. `LabelLayoutEngine.ts` and `qrRenderSize.ts` compute from it directly; `LabelPreview.tsx` emits it onto the label container as CSS custom properties (`labelTypographyCssVars`, using the `cssVars` helper); `LabelPreview.css` consumes `var(--label-section-label-em)` and equivalents instead of hardcoded literals. `labelTypography.test.ts` asserts every emitted custom property's value and unit match the constant it mirrors. The box's 0.8cqw horizontal padding stays a plain CSS literal — the engine only ever modeled the vertical padding for its height estimate, so no matching constant was invented for it.

### Label render model — incomplete layout plan

**Resolved:** 2026-08-02 (Phase 3 action 3.4). `LabelRenderModel` now carries resolved `columnLayout` and `identityHeaderTitleBreakout`; `LabelPreview` reads them and no longer imports `labelColumnLayout`.

### Calculator default mode — two remaining hard-coded literals

**Resolved:** 2026-08-02 (Phase 2 exit). `LabelDesignerView` example input and `TargetUnitsSolve` now import `DEFAULT_CALCULATOR_SOLVE_MODE` instead of hard-coding `'target_units'` for defaults/identity. Remaining `'target_units'` literals are intentional mode discriminators (comparisons, fixtures, registry keys), not duplicate defaults.

### Title height weight constant — clamp makes most of its range dead

**Resolved:** 2026-08-02 (Phase 1 action 1.1). Replaced `Math.min(TITLE_HEIGHT_WEIGHT + 0.06, 0.55)` with a single named constant `TITLE_HEIGHT_WEIGHT_WITH_BODY = 0.55` and removed the unused base constant.
