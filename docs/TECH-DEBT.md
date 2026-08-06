# Tech debt and known issues

Tracked **bugs, quality gaps, and fix-up work that an agent can close** — not product roadmap items (those live in [FRD.md](./FRD.md)), and not work that needs a person or physical hardware to verify (that lives in [HUMAN-TASKS.md](./HUMAN-TASKS.md)).

Every item here should be closeable by reading, changing, and testing code. If closing an item would require printing a label, judging output by eye, or a decision only the product owner can make, it belongs in `HUMAN-TASKS.md` instead — mixing the two makes this list look permanently unfinishable.

When an item is fixed, move it to **Resolved** with a one-line note (date + what changed).

**What “Open: None” excludes (2026-08-04):** two items in [HUMAN-TASKS.md](./HUMAN-TASKS.md) stay open because they need a physical Niimbot B21 print (no hardware access as of this date). [FRD.md](./FRD.md) Planned is intentional product roadmap, not debt.

---

## Open

### Revisit width safety fractions after TextMeasurer

**Priority:** Low  
**Status:** Open — measurement is exact; residual fractions may still over-constrain.

**Symptom:** `TITLE_WIDTH_FRAC` (0.92), `SPARSE_TITLE_WIDTH_FRAC` (0.98), `SPARSE_TESTING_WIDTH_FRAC` (0.85), and danger-mode width fractions were tuned when glyph width was a flat em estimate. With `TextMeasurer` (ADR 0009), they may leave more unused horizontal room than necessary.

**Hypothesis:** tightening these slightly (after browser checks on HGH / Tirzepatide / Human Chorionic Gonadotropin) could reclaim a little more type size without overflow. Do not change them blindly — goldens and preview must stay in sync.

**Files:** `IdentityHeaderTemplate.ts`, `labelColumnLayout.ts` (`DANGER_TITLE_WIDTH_FRAC`).

---

## Resolved

### Long compound name + dense body + 3 tests clips the title top

**Resolved:** 2026-08-05. Added `titleInkOverflowEm` to `LABEL_TYPOGRAPHY` — mirrored in `estimateTitleHeightPx` and as top padding on `.label-preview-title` / `.danger-title-wrapper` — so bold ascenders clear the rounded sticker's `overflow: hidden`.

### Danger/untested label with no body wastes the whole center column

**Resolved:** 2026-08-05. `hasBody` / `isSparse` ignore demotedTitle alone; danger without recon/protocol/source uses sparse composition with the DANGER banner, demoted compound, and badges stacked and centered.

### Consider adding `eslint-plugin-jsx-a11y`

**Resolved:** 2026-08-04. Added `eslint-plugin-jsx-a11y` recommended rules for `src/**/*.tsx`. Two files had violations (`PrintSetupCatalogStockPanel`, `PrintSetupSection`) — associated printer/stock labels via `htmlFor`/`id`; vial-capacity heading became a non-label because the control already self-labels. Probe confirmed `alt-text` fires.

### No lint rule enforces `Result` construction through `ok()` / `err()`

**Resolved:** 2026-08-04. Migrated all 28 production literal constructions to `ok()`/`err()` (renamed local `ok` booleans in three validators to `valid` to avoid shadowing). Added `no-restricted-syntax` banning `ObjectExpression > Property[key.name="ok"]` outside `result.ts` and tests; probe confirmed it fires.

### The `**/*.tsx` import ban cannot fire, so JSX purity is unenforced

**Resolved:** 2026-08-04. Replaced `**/*.tsx` with `**/components/**` in both purity blocks. Probe modules importing `./components/FormInputs` from label math and from domain each produced the expected error; probes removed.

### "Authoritative draw-units scenario" duplicate group is not mechanically findable

**Resolved:** 2026-08-04. Identified as vial 22 mg / protocol 4 mg / 27 units. Added `authoritativeDrawUnitsScenario` builder; the three call sites (pure math, resolver fresh, resolver with stale seeds) are different units and all stay. Not duplication.

### `DEFAULT_DRAW_UNITS_PER_MG` still means three different things

**Resolved:** 2026-08-04. Split into three named constants at the same value (10): rate/scaling keeps `DEFAULT_DRAW_UNITS_PER_MG` / `_PER_IU`; display placeholder is `PLACEHOLDER_DRAW_UNITS`; IU floor is `DRAW_UNITS_IU_FLOOR`. No arithmetic change.

### Residual `vialMl` fallbacks beside `vialCapacityMl`

**Resolved:** 2026-08-04. Removed the two `?? selection.vialMl` fallback reads in `PrintCatalogFilter` and `useApplyDesignViewModel`. The legacy field and `normalizePrintSetup` migration stay at the codec boundary so existing saved print setups still load.

### Silent numeric coercion / error-convention convergence

**Resolved:** 2026-08-04. The error-convention convergence plan converted every hand-rolled `{ ok }` shape to the shared `Result<T, E>` (ADR 0005), gave three storage reads distinct absent/corrupt/unavailable outcomes, converged ten `undefined`-for-absence returns onto `null`, and — the last, riskiest step — changed `parseNumericField` to return `number | null` instead of a silent `0`, fixing the seven callers and a latent bug in `isPresetSelected` along the way. The golden snapshot never moved across any of it.

### `validateElement` failure side is empty because issues go to a caller array

**Resolved:** 2026-08-04. `validateElement` now returns `Result<DesignElement, DesignDocumentValidationIssue[]>` and builds its own issues array; the caller-supplied parameter is gone. Document-level issue accumulation in `validateDesignDocument` is unchanged.

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
