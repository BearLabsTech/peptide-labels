# Tech debt and known issues

Tracked **bugs, quality gaps, and fix-up work that an agent can close** — not product roadmap items (those live in [FRD.md](./FRD.md)), and not work that needs a person or physical hardware to verify (that lives in [HUMAN-TASKS.md](./HUMAN-TASKS.md)).

Every item here should be closeable by reading, changing, and testing code. If closing an item would require printing a label, judging output by eye, or a decision only the product owner can make, it belongs in `HUMAN-TASKS.md` instead — mixing the two makes this list look permanently unfinishable.

When an item is fixed, move it to **Resolved** with a one-line note (date + what changed).

---

## Open

### Calculator state — separate authored inputs from derived values

**Priority:** Medium
**Status:** Partial (updated 2026-08-02, Phase 2 closed) — Phase 2 actions 2.1–2.7 are complete: `CalculatorState = { authored, derived }` landed; `mergedInput` write-back is gone; pure `calculatorReducer` + frozen `SolveStrategy` registry live under `domain/`; identifiers match COPY-GUIDELINES vocabulary (`compoundAmount`, `protocolAmount`, `protocolUnits`, `syringeCapacityMl`). `useLabelForm.ts` is `useReducer` plus dispatch wrappers.

What remains (deferred past Phase 2): recommended/system-generated values (a fresh target concentration, draw-units label, or recomputed water) are still written back into the same flat `LabelModelInput` fields a user types into (`targetConcentration`, `protocolUnits`, `reconstitutionAmount`, `concentration`), distinguished only by a `*Origin: 'recommended' | 'user'` provenance flag rather than a type-level separation. Closing this fully would mean those recommendations live in `derived` instead and are never assigned into the authored fields at all.

**Symptom:** `LabelModelInput` still carries some calculator results the assist/sync path writes back, tagged with provenance rather than kept structurally separate. **This is not only a type-hygiene concern — two live defects follow from it, both reproduced against the reducer on 2026-08-03:**

**Defect 1 — an origin outlives its value.** In Manual Entry, authoring a draw volume and then typing a water volume leaves `{ protocolUnits: "", protocolUnitsOrigin: "user" }`: a provenance flag describing a value that no longer exists. Five sites clear `protocolUnits` without touching its origin — `domain/standardSolve.ts:13-15` and `:41`, `domain/targetUnitsSolve.ts:20`, `domain/roundConcentrationSolve.ts:25`, `calculatorReducer.ts:120`. The invariant sweep (2026-08-03) found **19 distinct two-event paths** into this state, reached via `WaterChanged` *and* `TargetConcentrationChanged`. `targetConcentrationOrigin` has no such paths — `calculatorReducer.ts:117` sets it correctly.

**Defect 2 — a derived value is labelled as user-authored.** In Set Concentration, authoring a target concentration of 5 (10 mg compound, 2 mg protocol amount) yields `{ protocolUnits: "40 units", protocolUnitsOrigin: "user" }`. Nobody typed 40 units; `domain/roundConcentrationSolve.ts:125-128` derived it, then tagged it `'user'` because the *target* was authored. Because `'user'` blocks regeneration (`domain/targetUnitsSolve.ts:61` and `:113-114`), that derived draw volume then survives a vial-capacity change that should have refreshed it.

**Correction to an earlier framing of this entry:** `LabelModelInput` is **not** persisted. Verified 2026-08-03 — the only holder is `useState<LabelModelInput>` at `App.tsx:28`, and no storage module (`print/printStorage.ts`, `customDesign/designDocument.ts`, `customDesign/designPackage.ts`, `platform/LocalStorageKeyValueStore.ts`) references the type. Calculator state is in-memory only, so closing this needs no migration and no save/reload decision.

**When fixing:** give each field its own slot for the system's value (`recommendedProtocolUnits`, `recommendedTargetConcentration`) and delete the `*Origin` flags — the slot then *is* the provenance, which makes both defects above unrepresentable rather than merely fixed. Order matters: `domain/roundConcentrationSolve.ts:42` inspects `protocolUnitsOrigin` even when the value is empty, so it needs a live-value guard (`hasPositiveDrawUnits`) *before* the origin is corrected, or a Set Draw Volume → Set Concentration switch will discard authored water. Inspect `domain/solveStrategy.ts`'s three implementations and `calculatorModeSwitch.ts`'s `Provenance<T>` / `protocolUnitsPatch` / `targetConcentrationPatch` helpers. Full step-by-step in the quality follow-up plan, action 5.

**Standard:** CODE-QUALITY.md section B — separate authored from derived data.

---

### View-model components still over the ~120-line soft budget

**Priority:** Low
**Status:** Open — noted at Phase 5 action 5.1 (2026-08-03).

**Symptom:** After extracting `useApplyDesignViewModel`, `useCalculatorViewModel`, `usePrintSetupSectionViewModel`, and `useLabelStageViewModel` (5.1), all decision logic left each of `ApplyDesignView.tsx` (195 lines), `CalculatorView.tsx` (189), and `PrintSetupSection.tsx` (151) — but the components themselves are still over the ~120-line soft budget in `docs/CODE-QUALITY.md` section A, because the remaining lines are JSX markup volume (many form fields / library-list rows / catalog-vs-custom panels), not logic. `LabelStage.tsx` (59) and the individual `SidebarSections.tsx` exports are within budget.

**When fixing:** If this is worth doing, split the JSX itself into smaller named subcomponents per section/panel (e.g. `ApplyDesignView`'s library list, `PrintSetupSection`'s catalog vs. custom panels) — a presentation-only decomposition, not a further view-model extraction. Still open after Phase 5 exit (5.2–5.8); line counts remain in the same band (ApplyDesign ~209, Calculator ~190, PrintSetup ~149, plus SidebarSections / FormInputs markup volume).

**Standard:** CODE-QUALITY.md section A — component ~120-line soft budget.

---

### Compound name casing — do not default to all caps

**Priority:** Low  
**Status:** Open

**Symptom:** Compound name on the label is forced to uppercase (`LabelComposer` uppercases before layout; `LabelPreview.css` applies `text-transform: uppercase` on the title). Users may prefer mixed case as entered.

**When fixing:** Preserve user-entered casing in the model; reserve uppercase for section labels (RECONSTITUTION, PROTOCOL, etc.) and danger mode only if product agrees.

**Standard:** CODE-QUALITY.md section C — ubiquitous language / user intent preserved.

---

## Resolved

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
