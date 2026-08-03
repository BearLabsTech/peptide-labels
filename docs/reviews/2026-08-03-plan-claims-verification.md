# Plan claims verification — Phase 8.3

**Date:** 2026-08-03
**Plan audited:** `peptide_labels_refactor_71a509a2.plan.md`, Step zero and Phases 0–7 (65 actions)
**Method:** every action's Principle/Where/Do/Verify text read, then checked against the current working tree by search and file read. Progress-log prose was never accepted as evidence. Local gate re-run as part of this pass.

## Gate state at time of audit

- `npm run lint` — clean (exit 0).
- `npm run test:coverage` — 59 test files, 593 tests passing; All files 88.55 / 85.73 / 89.02 / 90.12 against thresholds 88 / 85 / 89 / 90.
- Golden snapshot `src/features/label/__snapshots__/LabelComposer.golden.test.ts.snap` — 42 cases, unchanged since `9fc9ba8`.

## Verdict summary

| Verdict | Count |
|---|---|
| Landed | 54 |
| Deviated-but-recorded | 5 |
| Partially landed | 6 |
| Not landed | 0 |

---

## Action-by-action verdicts

### Step zero

| ID | Verdict | Evidence |
|---|---|---|
| Step zero | Landed | Outcome section records all nine load-bearing claims; both corrections it produced are visible in code (`vite.config.ts:47-52` thresholds, `labelModel.ts:28-34` water/draw formatter split). |

### Phase 0 — Safety net and standards

| ID | Verdict | Evidence |
|---|---|---|
| 0.1 Vitest config | Deviated-but-recorded | `vite.config.ts:8-53` — `test.coverage` block present with `provider: 'v8'`, exclude list and thresholds. Exclude list grew in Phase 5 to drop all `src/**/*.tsx` plus 12 named hooks (`vite.config.ts:28-41`), which narrows the denominator; recorded in the Phase 5 exit log. |
| 0.2 Humble Object rule | Landed | `.cursor/rules/testing-vitest.mdc:30-63` (Humble Object), `:27-28` (snapshot carve-out + `vitest -u` prohibition), `:70-72` Unacceptable shortcuts intact. |
| 0.3 Golden tests | Landed | `src/features/label/LabelComposer.golden.test.ts:113-121`; snapshot contains exactly 42 `exports[` entries, matching the plan's claim. |
| 0.4 Test data builders | Landed | `src/features/label/testing/labelInputBuilder.ts:106` `aLabelInput()` plus five named presets at `:111, :125, :135, :149, :159`. |
| 0.5 Re-express internal assertions | Landed | Zero `mergedInput` matches anywhere in `src/` (whole-tree search). |
| 0.6 Collapse triplicated scenarios | Landed | Shared builder scenarios are consumed by the resolver/math tests; suite green at 593 tests with coverage at threshold. |
| 0.7 Normalize test naming | Landed | Zero matches for `it\(['"][a-z]+[A-Z]` across `src/`. |
| 0.8 CODE-QUALITY.md | Landed | `docs/CODE-QUALITY.md` — all seven sections A–G present at lines 16, 70, 92, 114, 130, 141, 157. |
| 0.9 Thin always-applied rule | Landed | `.cursor/rules/code-quality.mdc` present and tracked. |
| 0.10 Review skill | Landed | `.cursor/skills/code-quality-review/` contains `SKILL.md`, `heuristics.md`, `known-findings.md`, `report-template.md`. |
| 0.11 Pixel reference | Landed | `docs/reference-exports/40x20-rounded.png` + `README.md`; scope reduction to one stock recorded in the plan and in ADR `0007-pixel-reference-one-stock.md`. |

### Phase 1 — Foundations

| ID | Verdict | Evidence |
|---|---|---|
| 1.1 Name magic numbers | Landed | `labelLayoutConstants.ts:3, 6, 8, 11, 17`; `domain/units.ts:4, 6`; `qrRenderSize.ts:27`. `TITLE_HEIGHT_WEIGHT` collapsed to `TITLE_HEIGHT_WEIGHT_WITH_BODY = 0.55`. |
| 1.2 Unit value objects | **Partially landed** | `domain/units.ts:48-97` — six `make*` constructors returning `Result`, `units.test.ts` covers each. But no production module imports any of them (only `units.test.ts` does). See findings. |
| 1.3 Delete duplicated conversion | Landed | Single `protocolAmountInVialUnits` at `domain/units.ts:104`; `calculatorGuards.ts:42` parses then delegates; zero matches for `protocolAmountToVialUnits`. |
| 1.4 Collapse duplicated formatters | Landed | `formatWaterVolumeLabel` gone; `labelModel.ts:33` delegates to `formatDrawUnitsLabel`; `' ml'` composed at the print call site (`labelContent.ts:132`). |
| 1.5 px/mm helper | Landed | `print/dimensions.ts:17` `pxToMm`; used at `IdentityHeaderTemplate.ts:265`, `TitleBodyFitter.ts:212`, `testIndicatorLayout.ts:117`. No inline `25.4` in the label pipeline. |
| 1.6 Result type | Landed | `src/shared/result.ts` + `result.test.ts`, 100% coverage on the module. |
| 1.7 Fix `unknown[]` contract | Landed | `qrRenderSize.ts:11-18` takes `qrCodeCount` / `testIndicatorCount`. Deprecated alias `QrRenderLayoutModel` retained at `:20-21`. |
| 1.8 Replace unchecked casts | Landed | `domain/units.ts:137, 143`; `calculatorModeSwitch.ts:52`; `testIndicators.ts:54`. Each has valid/invalid/non-string test cases. |
| 1.9 Remove non-null assertions | Landed | Zero non-null assertions in `peptideMath.ts` (whole-file search). |
| 1.10 Type CSS custom properties | Landed | `src/shared/cssVars.ts:4`; `LabelPreview.tsx:28` uses `cssVars({...})`. |
| 1.11 Readonly domain types | Landed | `readonly` on every field of `LabelRenderModel` (`labelRenderModel.ts:8-28`), `LabelModelInput` sub-models (`labelModel.ts:37-149`), `print/types.ts` (46 occurrences), `designDocument.ts` (64). |
| 1.12 Freeze exported constants | Landed | `as const` at `testIndicators.ts:15, 28, 39, 46`, `labelLayoutConstants.ts:33, 40`, `print/defaults.ts:22`, `sampleMitochondriaDesign.ts:116`; `Object.freeze` at `calculatorPresets.ts:12` and `calculatorModeSwitch.ts:46`, each with an `Object.isFrozen` regression test (`calculatorPresets.test.ts:21`, `calculatorModeSwitch.test.ts:26`). |
| 1.13 Close reference leaks | Landed | `printCatalog.ts:120-131` clones both getters; `IndexedDbDesignLibrary.ts:59` `structuredClone` on `get`; typed document built fresh (`designDocument.test.ts:55-66`); title lines copied at `IdentityHeaderTemplate.ts:213, 224, 229`. Regression test for catalog mutation at `printCatalog.test.ts:48`. |
| 1.14 Stop mutating an argument | Landed | `LabelLayoutEngine.ts:251-252` — `processWord` exported and pure; caller threads state at `:230-233`; direct tests at `LabelLayoutEngine.test.ts:119-137` including `expect(next).not.toBe(before)`. |

### Phase 2 — Calculator state

| ID | Verdict | Evidence |
|---|---|---|
| 2.1 Fix mode default | Landed | Single `DEFAULT_CALCULATOR_SOLVE_MODE = 'target_units'` at `peptideMath.ts:44`; one application point `resolveCalculatorMode` at `:51-55`; `calculatorModeSwitch.ts:6` re-exports rather than redeclaring. Golden change is deliberate and explained in commit `35427fc`. |
| 2.2 Split into sub-models | Landed | `labelModel.ts:37-149` defines the nine sub-models; `:158-166` composes them as an intersection so flat call sites still compile. |
| 2.3 Encode per-mode constraints | **Partially landed** | `UnitWorld` union at `domain/units.ts:155-168` and applied throughout `peptideMath.ts`; per-mode discriminated union `CalculatorModeInput` at `calculatorGuards.ts:18-33`. But provenance and print visibility are still flat optional fields (`labelModel.ts:67, 79, 133-149`) with `Provenance<T>` / `PrintableField<T>` only as read/write helpers. See findings. |
| 2.4 Separate authored from derived | Landed | `LabelMathResolver.ts:18-25` `CalculatorState = { authored, derived }`; zero `mergedInput` in `src/`. |
| 2.5 Pure reducer | Landed | `calculatorReducer.ts:16-24` — nine events; `useLabelForm.ts:31-51` is dispatch wrappers only; `calculatorReducer.test.ts` present. |
| 2.6 Solve-mode strategies | **Partially landed** | `domain/solveStrategy.ts:84-88` frozen registry + three strategy modules each with tests. But the action's own Verify (no mode branching outside the registry) fails in five production modules. See findings. |
| 2.7 Rename to product vocabulary | Landed | Zero case-insensitive matches for `vialAmount` / "vial amount" in `src/`; `capacityMl` collision resolved — `syringeCapacityMl` vs `vialCapacityMl` used consistently. |

### Phase 3 — Composition and layout

| ID | Verdict | Evidence |
|---|---|---|
| 3.1 LabelTemplate | Landed | `templates/LabelTemplate.ts` + `IdentityHeaderTemplate.ts:55-71`; `LabelComposer.ts:29-37` is a 9-line coordinator. |
| 3.2 TitleBodyFitter | Landed | `templates/TitleBodyFitter.ts` + `TitleBodyFitter.test.ts`; goldens byte-identical across the phase (no snapshot commit between `35427fc` and `9fc9ba8`). |
| 3.3 Render-model builder | Landed | `LabelRenderModelBuilder.ts`; both assembly paths share the seeded builder (`IdentityHeaderTemplate.ts:188-236`). |
| 3.4 Column geometry in render model | Landed | `labelRenderModel.ts:26, 28`; `LabelPreview.tsx` has no `labelColumnLayout` import. Snapshot gained only additive fields (commit `9fc9ba8`). |
| 3.5 Unify typography with CSS | Landed | `labelTypography.ts:13-33` single `LABEL_TYPOGRAPHY`; consumed by `LabelLayoutEngine.ts:90-125` and `qrRenderSize.ts:39`; emitted at `LabelPreview.tsx:189`; CSS consumes `var(--label-*)` at `LabelPreview.css:142, 152, 193, 200, 333, 339, 343`; drift test `labelTypography.test.ts`. Residual risk noted in findings (CSS keeps fallback literals nothing pins). |
| 3.6 Decompose layout method | Deviated-but-recorded | Decomposition targeted `IdentityHeaderTemplate` step bodies instead of `LabelComposer.calculateLayouts` (which moved in 3.1) — recorded in the Phase 3 progress log. Every method in `IdentityHeaderTemplate.ts` is under 30 lines and takes ≤4 parameters (context objects at `:112, :188, :216, :238`). |

### Phase 4 — Ports and adapters

| ID | Verdict | Evidence |
|---|---|---|
| 4.1 Define ports | Landed | `src/shared/ports.ts:24-70` — all six interfaces, no implementations. Moved from `domain/ports.ts` in 7.1; `features/label/domain/ports.ts` is now a re-export shim. |
| 4.2 Export use case | Landed | `app/ExportLabelUseCase.ts:14-39` depends only on ports; `ExportLabelUseCase.test.ts:33-35` asserts the spec, the DPI, and the filename against fakes. |
| 4.3 Write adapters | Landed | `src/platform/` holds all five adapters plus `randomId.ts`; whole-tree search shows `localStorage`, `indexedDB`, `new Image(`, `createElement('canvas')`, `.toBlob(`, `URL.createObjectURL`, `crypto.randomUUID`, `scrollIntoView`, `html-to-image` occur only under `src/platform/` and test files. `FileReader` is the one exception (`components/readImageFileAsDataUrl.ts:11`), recorded in the Phase 5 and Phase 6 exit logs. |
| 4.4 Filename policy | Landed | `app/exportFileName.ts` + `exportFileName.test.ts`. |
| 4.5 Scroll behind a port | Deviated-but-recorded | `Scroller` port + `platform/BrowserScroller.ts:7`; `usePrintSetup.ts:16, 38`. Tested via extracted `openPrintSetupSection` rather than the hook itself — recorded in the Phase 4 exit notes. |
| 4.6 Shared print module | Landed | `src/print/` exists; zero `../label/print` or cross-feature imports remain. Only `App.tsx` (composition root) and `src/test/memoryDesignLibrary.ts` reference both features. |
| 4.7 Remove React from non-React modules | **Partially landed** | The two named files are clean (`print/labelSurfaceStyle.ts`, `customDesign/designFrameStyle.ts` — no React import). But three non-`.tsx` modules now import React types, one of them on the pure layout engine's import graph. See findings. |
| 4.8 Split leaky barrels | **Partially landed** | `syringe/index.ts:1-9` is domain-only; `customDesign/index.ts` deleted; `PrintTargetBanner.tsx:1-3` imports source modules directly. But `src/print/index.ts` still `export *`s eleven modules and has zero importers. See findings. |

### Phase 5 — UI layer

| ID | Verdict | Evidence |
|---|---|---|
| 5.1 Extract view models | Deviated-but-recorded | All five hooks exist with tests: `useApplyDesignViewModel`, `useCalculatorViewModel`, `useSidebarSectionsViewModel`, `usePrintSetupSectionViewModel`, `useLabelStageViewModel`. The ~120-line component budget is still missed by six components; recorded in `TECH-DEBT.md:76-85` and the Phase 5 exit log. |
| 5.2 Pull domain logic out of views | Landed | `labelModelFixtures.ts` holds both fixtures; `LabelDesignerView.tsx:5, 43` imports `getExampleInput`; no `resolveLabelMath` call in `CalculatorView.tsx`. |
| 5.3 Wrap use cases in hooks | Landed | `customDesign/useDesignLibrary.ts`, `app/useLabelExport.ts`, `landing/useAgreementGate.ts`. |
| 5.4 Error boundary | Landed | `WorkspaceErrorBoundary.tsx` wired at `App.tsx:12`; `resolveDesignPrintTarget.ts:68-77` returns `Result`, with `resolveDesignPrintTargetOrDefault` at `:83-103` falling back to `SKIP_DEFAULT_TARGET` and logging. |
| 5.5 Close silent-failure gaps | Landed | `landingPersistence.ts:43, 49` and `printStorage.ts` return/check `Result`; `usePrintSetup.ts:18-21` surfaces the message. Only one bare `catch {` left in `src/` (`coaLinks.ts:29`, URL parse). Every other catch logs — visible as `console.error` output in the test run. |
| 5.6 Centralize UI strings | Landed | `features/label/uiStrings.ts` holds workspace mode labels, handoff prompt, field labels, COA captions; consumed by `LandingPage.tsx:2`, `SidebarSections.tsx`, `AgreementModal.tsx:4`. |
| 5.7 Inline styles onto tokens | Landed | `components/formStyles.ts:4` shared `inputStyle` imported by `FormInputs.tsx:4`, `PrintSetupSection.tsx:6`, `SidebarSections.tsx:20`. `#e0e0e0` / `#b42318` gone from `src/`; `#fafafa` survives only as the token definition in `index.css:16`. |
| 5.8 Accessibility gaps | Landed | `FormInputs.tsx:127, 145, 185, 229, 270` pair `htmlFor`/`id`; `aria-busy` at `LabelStage.tsx:60`, `ApplyDesignView.tsx:55, 168`, `FormInputs.tsx:195`; `aria-describedby` at `ApplyDesignView.tsx:201`; `useDialogAccessibility.ts` provides the shared trap/Escape. |

### Phase 6 — customDesign alignment

| ID | Verdict | Evidence |
|---|---|---|
| 6.1 Validator registry | Landed | `elementValidators/` holds four per-kind validators plus `elementValidator.ts` and `elementValidatorRegistry.ts`, each with a test file. |
| 6.2 Remove unsafe double cast | Landed | Zero `as unknown as DesignDocument` in `src/`; `designDocument.test.ts:55-66` asserts the returned document and its four nested collections are distinct objects from the caller's input. |
| 6.3 Surface validation issues | Landed | `ApplyDesignView.tsx:214` renders `<ul className="apply-design__import-issues">`; `FRD.md:45` records the behavior. |
| 6.4 Route library through its port | Landed | `designLibrary.ts:1-12` aliases the shared port and delegates to the platform adapter; `src/test/memoryDesignLibrary.ts` + `designLibrary.test.ts` exercise list/get/put/remove. |
| 6.5 Reuse shared export path | Landed | `app/exportLabelPng.ts:17-23` is the single composition root; zero `html-to-image` / `new Image(` / `.toBlob(` matches under `src/features/customDesign/`. |

### Phase 7 — Guardrails

| ID | Verdict | Evidence |
|---|---|---|
| 7.1 ESLint layer rules | Landed | `eslint.config.js:23-109` — three restriction blocks (views→platform, label↔customDesign, domain→react/react-dom/platform/`.tsx`). `npm run lint` clean; zero `eslint-disable` comments naming `no-restricted-imports` in `src/`. |
| 7.2 Gate CI | Landed | `.github/workflows/deploy.yml:40-41` — Test step is `npm run test:coverage`. |
| 7.3 Ratchet thresholds | Deviated-but-recorded | `vite.config.ts:47-52` at 90/88/85/89; measured 90.12/88.55/85.73/89.02. Thresholds only ever rose. But the coverage denominator narrowed in Phase 5, so the numbers are not comparable to the Phase 0 baseline; recorded in the Phase 5 exit log. |
| 7.4 Write ADRs | Landed | `docs/ADR/0001`–`0007` — five decisions plus the two backfilled Phase 0 decisions. Each states decision, rejected alternatives, and why (e.g. `0005-one-error-convention.md:10-13`). |
| 7.5 Update rules and docs | **Partially landed** | `CODE-QUALITY.md`, `COPY-GUIDELINES.md:29-37` (canonical identifier table), `domain-label-architecture.mdc:16-18` (app/infra rows), `ui-web-standards.mdc`, `known-findings.md`, `FRD.md:13, 45` all updated. But only two of the four named TECH-DEBT items reached **Resolved**. See findings. |

---

## Findings — what is actually wrong

Six actions did not fully land. None is a behavior regression; all are migration residue or an unmet Verify criterion. Ordered by how much a future implementer would want to know.

### F1 — 2.6: mode branching still lives outside the SolveStrategy registry

**Action's own Verify:** "`rg "calculatorSolveMode ===|mode ===" src/features/label` (excluding the registry lookup itself and its tests) returns no remaining mode-branching outside the registry."

That criterion fails. Remaining production mode-branching:

- `src/features/label/domain/roundConcentrationSolve.ts:42` — `draft.calculatorSolveMode === 'target_units' && draft.protocolUnitsOrigin === 'recommended'`. This is the significant one: a strategy inspecting *another* mode's id, which is exactly the cross-mode coupling the registry was meant to delete. Adding a fourth mode requires editing this strategy.
- `src/features/label/calculatorModeSwitch.ts:86` — `if (mode === 'round_concentration')` inside `displayDrawUnits`; and `:76-78` in `displayWaterAmount`, `:123` in `ensureReconstitutionPrintForAssist`. Display-precedence rules that differ per mode, living outside the strategy that owns the mode.
- `src/features/label/calculatorGuards.ts:26, 29` (`parseCalculatorModeInput`) and `:80, 87` (`calculateRequiredWaterMl`) — the first is legitimate (it *constructs* the discriminated union); the second re-derives water per mode independently of `SolveStrategy.deriveMath`, so vial-capacity warning math and calculator math are two code paths for the same fact.
- `src/features/label/useCalculatorViewModel.ts:140-142` and `components/useSidebarSectionsViewModel.ts:97-98, 113` — field visibility per mode. Arguably a UI concern, but it means a fourth mode touches two view models too.

**To fix:** decide whether display precedence and field visibility belong on `SolveStrategy` (e.g. `displayPrecedence()` / `visibleFields()` members) or are legitimately a UI concern to be exempted in the Verify line. Then remove `roundConcentrationSolve.ts:42`'s cross-mode read — the information it needs (is the current draw-units value system-generated?) is already carried by `protocolUnitsOrigin` alone.

### F2 — 2.3: provenance and print-visibility pairing are helpers, not type constraints

The action said to fold provenance into the field it describes (`{ value, origin }`) "so `protocolUnitsOrigin` cannot exist without `protocolUnits`", and to replace value-plus-visibility-toggle pairs with one `PrintableField<T>`.

What shipped instead: `Provenance<T>` (`calculatorModeSwitch.ts:13-24`) and `PrintableField<T>` (`labelModel.ts:175-183`) exist as write-side patch builders and read-side accessors, but the underlying model still stores flat independent optionals — `protocolUnits?` / `protocolUnitsOrigin?` (`labelModel.ts:65, 67`), `targetConcentration?` / `targetConcentrationOrigin?` (`:77, 79`), and the twelve `show*` flags separate from their values (`:133-149`). The illegal states the action targeted are still representable.

This is documented honestly in the code comment at `labelModel.ts:168-174` and in `TECH-DEBT.md:11-22` ("Status: Partial"), but **the plan has no Phase 2 progress log at all** — Phases 0, 1, and 3 have one, Phases 4–7 have exit notes, Phase 2 has neither. That is the only phase whose deviations are invisible from the plan document.

**To fix:** the TECH-DEBT entry already names the work and the files (`domain/solveStrategy.ts`'s three implementations, `calculatorModeSwitch.ts`'s patch helpers). Add a Phase 2 progress log to the plan so this deviation is not rediscovered a third time.

### F3 — 4.8: `src/print/index.ts` is an orphaned barrel

The action said to split the barrel so `formatPrintTargetSummary` no longer drags `printStorage.ts` (and therefore `localStorage`) in transitively. The consumers were repointed correctly — `PrintTargetBanner.tsx:1-3` imports the three source modules directly — but the barrel itself was left in place, still `export *`-ing eleven modules (`src/print/index.ts:1-11`).

It has **zero importers** anywhere in `src/`. It is dead code that reproduces exactly the shape 4.8 set out to remove, and the next person who reaches for a print symbol will find it and use it.

**To fix:** delete `src/print/index.ts`. Nothing imports it; `npm run build` and `npm run test:run` will not notice.

### F4 — 4.7: React types are back in non-`.tsx` modules, including the layout engine's import graph

The two files 4.7 named are clean. But three non-`.tsx` modules now import from `react`:

- `src/features/label/labelTypography.ts:1` — `import type { CSSProperties } from 'react'`
- `src/shared/cssVars.ts:1` — same
- `src/features/label/components/formStyles.ts:1` — same

The first matters. `LabelLayoutEngine.ts:3` imports `LABEL_TYPOGRAPHY` from `labelTypography.ts`, so the pure layout engine — the module `domain-label-architecture.mdc` treats as core math — now has React on its type-import graph. The Phase 7 lint rule does not catch this because the rule keys on the `src/**/domain/**` path, and none of these three files lives under a `domain/` directory. The rule is narrower than the principle it was written to enforce.

**To fix:** split `labelTypography.ts` into the pure metrics object (no React) and a separate `labelTypographyCssVars.ts` presenter that imports `CSSProperties`, so the engine imports only the former. Consider widening the ESLint domain block to cover the pure label modules by name, or moving them under `domain/`.

### F5 — 1.2: the value objects have no production callers

`domain/units.ts:48-97` defines `makeMass`, `makeVolumeMl`, `makeConcentrationPerMl`, `makeDrawUnits`, `makeVialCapacityMl`, `makeSyringeCapacityMl` and their six branded types, each returning `Result` and each covered by `units.test.ts`. A whole-tree search finds **no other importer** — every one of the six is called only from its own test.

The plan explicitly deferred the wide conversion ("introduce the types and adopt them at the boundaries the Phase 2 parsed draft will use"), so half the action landed as written. The other half did not: Phase 2's parsed draft is `CalculatorModeInput` (`calculatorGuards.ts:18-21`), and it carries plain `number` for `waterMl`, `drawUnits`, and `targetConcentration`. `VialCapacityMl` is still `= number` at `print/vialCapacity.ts:1` — the alias 1.2 named as "an alias that provides no protection whatsoever" — and `print/vialCapacity.ts:8-9` still uses two non-null assertions.

Two honest resolutions, and 8.4 is the right place to choose: adopt the constructors at the parse boundary (`parseCalculatorModeInput`, `normalizeVialCapacityMl`, `parseSyringeCapacityMl`), or delete the unused constructors as speculative generality.

Related, smaller: `makeUnitWorld` (`domain/units.ts:165`) returns `UnitWorld | null` rather than `Result`, in the same module that establishes the `Result` convention. Its five call sites all treat `null` as "invalid input, fall back", so this is intentional and commented — but it is a second failure convention living inside the module that introduced the first.

### F6 — 7.5: two of four TECH-DEBT items were never moved to Resolved

The action listed four items to move to **Resolved** with dates. Two made it (preview metrics duplication → `TECH-DEBT.md:108`, incomplete render-model layout plan → `:112`). Two did not:

- **"Calculator state — separate authored inputs from derived values"** (`TECH-DEBT.md:11`) — still **Open / Partial**. This is correct and well documented; it is F2. The plan's claim that 2.4 resolves it was optimistic.
- **"Print catalog compatibility — two relation sources"** (`TECH-DEBT.md:26`) — still **Open**. The plan's pattern section promised to resolve it by extending the Specification pattern at `PrintCatalogFilter.ts` to printer/stock compatibility. That extension was never done; only integrity tests were added. `printCatalog.ts:77-118` still declares the relation in both directions (`stocks[].printerIds` and `printers[].labelIds`).

**To fix:** either do the Specification extension (one canonical relation in `printCatalog.ts`, reverse lookups derived in `PrintCatalogFilter.ts`) or drop the claim from the next plan. Do not carry it forward unexamined a second time.

---

## Things checked and found clean

Recorded so the next pass does not redo them.

- **Golden snapshot drift.** `git log --follow` on the snapshot shows exactly three commits: creation (`6c23dca`), the 2.1 default fix (`35427fc`), and the 3.4 additive fields (`9fc9ba8`). Both changes carry a deliberate, in-commit explanation. `35427fc`'s message names the three affected scenarios, explains why the output changed (reverse math now authoritative), and states that every changed line was verified as that one recomputation. `9fc9ba8`'s states existing field values stayed byte-identical. No silent drift, no `-u` sweep. The golden **test** file changed once more (`630565f`) — import paths only.
- **Browser API containment.** Zero `localStorage` / `indexedDB` / `new Image(` / canvas / `toBlob` / `URL.createObjectURL` / `crypto.randomUUID` / `scrollIntoView` / `html-to-image` calls outside `src/platform/` and test files. The single documented exception is `FileReader` in `components/readImageFileAsDataUrl.ts:11`, recorded in two exit logs.
- **Cross-feature imports.** Zero `label ↔ customDesign` imports. `App.tsx` (composition root) and `src/test/memoryDesignLibrary.ts` are the only modules touching both; `landing` imports two shared items from `label` (`useDialogAccessibility`, `WORKSPACE_MODE_LABELS`), which no rule forbids.
- **Re-export shims are live, not orphaned.** `features/label/vialCapacity.ts`, `features/label/useLabelExport.ts`, `features/label/exportLabelToPng.ts`, and `features/label/domain/ports.ts` all have real importers. They read as duplicates in a file listing but are one-line re-exports. (`domain/ports.ts` re-exports seven types of which only `Scroller` is consumed — trivial, not worth acting on.)
- **`Result` values are checked.** Confirmed at the call sites this pass touched: `usePrintSetup.ts:20`, `landingPersistence.ts:49`, `resolveDesignPrintTarget.ts:96`, `useLabelExport.ts:54`.
- **Boundary erosion.** Zero `eslint-disable` comments naming `no-restricted-imports` in `src/`.
- **Ratchet honesty.** Thresholds only ever increased. Caveat under 7.3 above about the changed denominator.

## One residual risk worth recording

3.5 landed, but `LabelPreview.css` retains a fallback literal in every custom property it consumes (`var(--label-section-label-em, 0.55)` at `:333`, `var(--label-content-em, 0.82)` at `:343`, and five more). `labelTypography.test.ts` pins the module→variable mapping but nothing pins the CSS fallbacks, so a future edit to `LABEL_TYPOGRAPHY` leaves seven stale numbers in the stylesheet that would take effect the moment the custom properties fail to reach the element. The values agree today. Either drop the fallbacks or add a test that parses `LabelPreview.css` and compares them.
