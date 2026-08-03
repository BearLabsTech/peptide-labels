# Code quality review — 2026-08-03

## Scope

Whole repository, cold read, against every standard in [docs/CODE-QUALITY.md](../CODE-QUALITY.md). Reviewed at commit `d7fe106` ("Refresh quality docs and vocabulary after the refactor (7.5)"), working tree clean, i.e. immediately after Phase 7 exit.

Pass 1 was run principle-first with `known-findings.md` deliberately unread, using these angles: architecture map and layering enforcement; domain math correctness and the section G smell catalogue; test-suite quality and the UI layer; error convention and failure UX; type design, illegal states and immutability; ubiquitous language, comment quality and doc drift; single-source-of-truth across TypeScript/CSS plus repo tooling. Every finding below was re-opened and confirmed in the file itself before being written down.

Pass 2 read `known-findings.md` afterwards purely as a recall aid; three findings turned out to be recurrences of recorded patterns and three are analogues in new places. Those are grouped separately at the end.

Canonical docs read first: `docs/CODE-QUALITY.md`, `docs/FRD.md`, `docs/TECH-DEBT.md`, `docs/COPY-GUIDELINES.md`, plus every rule under `.cursor/rules/` and all five ADRs.

---

## Findings

Ordered: novel first, then recurrences, then analogues. Within each group, bugs and compliance violations lead, with two exceptions where a stylistic finding is kept adjacent to the finding it explains (`labelTypography.ts` next to the lint-glob gap that fails to catch it, and the `qrRenderSize.ts` doc-drift next to its own section-A verdict).

---

### Novel: the banned word appears in the code-quality standard itself

- **Standard violated:** `docs/CODE-QUALITY.md` section C — ubiquitous language (via `docs/COPY-GUIDELINES.md` § "Do not use 'dose'")
- **Location:** `docs/CODE-QUALITY.md:7`
- **Evidence:**

```md
**Why it matters here specifically:** this app is client-side only (no backend to catch mistakes server-side), does safety-critical dosing math (a wrong number can mean a wrong dose), and makes a hard promise that the on-screen preview matches the thermal-printed output exactly.
```

`COPY-GUIDELINES.md:13` states the word "must not appear **anywhere** in this project—code, UI, tests, user or developer documentation…", and `COPY-GUIDELINES.md:114` names itself as the single exception. A repo-wide search for `dose|dosing|dosage` returns exactly two live hits outside `COPY-GUIDELINES.md`, both on this one line. (`package-lock.json` hits are third-party `eslint.org/donate` funding URLs, not project language.)

- **Severity:** Compliance violation
- **Recommended change:** Rewrite the sentence with the approved vocabulary, e.g. "does safety-critical reconstitution math (a wrong number can mean a wrong measured amount)". Consider adding a lint or CI grep so the rule is enforced rather than remembered — it was the standards document itself that drifted.

---

### Novel: the ports layer uses three different failure conventions in one file

- **Standard violated:** `docs/CODE-QUALITY.md` section D — one error convention
- **Location:** `src/shared/ports.ts:47-65`
- **Evidence:**

```ts
export interface KeyValueStore {
  get(key: string): string | null
  /** Returns failure when the underlying store rejects the write (quota, privacy mode, etc.). */
  set(key: string, value: string): Result<void, string>
  remove(key: string): void
}

export interface DesignLibrary<TDocument extends { readonly id: string }> {
  list(): Promise<TDocument[]>
  get(id: string): Promise<TDocument | null>
  put(document: TDocument): Promise<void>
  remove(id: string): Promise<void>
}
```

Within a single 70-line file that exists specifically to define the I/O boundary, the same class of failure (the browser store is unavailable or rejects the operation) is signalled three different ways: `Result<void, string>` on `set`, `null` on `get`, and a rejected promise / silently-nothing on `remove`, `list`, `put`. `LocalStorageKeyValueStore` (`src/platform/LocalStorageKeyValueStore.ts:8-38`) implements all three faithfully — `get` swallows to `null`, `remove` swallows to `void`, only `set` reports. ADR `0005-one-error-convention.md` names `Result` as the convention; the port interfaces are where it is most load-bearing and least applied.

- **Severity:** Compliance violation
- **Recommended change:** Make every fallible port method return `Result` (`get(key): Result<string | null, string>`, `remove(key): Result<void, string>`, `list(): Promise<Result<TDocument[], string>>`, and so on), so a caller can tell from the signature alone what can fail. Section D explicitly says a caller must not have to guess.

---

### Novel: three modules hand-roll the shared `Result` type instead of importing it

- **Standard violated:** `docs/CODE-QUALITY.md` section D — one error convention
- **Location:** `src/features/customDesign/validateDesignDocument.ts:23-25`; `src/app/exportLabelToPng.ts:7-12`; `src/app/useLabelExport.ts:21-25,40-46`
- **Evidence:**

```ts
// validateDesignDocument.ts:23
export type DesignDocumentValidationResult =
  | { ok: true; document: DesignDocument }
  | { ok: false; issues: DesignDocumentValidationIssue[] }
```

```ts
// app/exportLabelToPng.ts:7
export async function exportLabelToPng(
  element: HTMLDivElement,
  printTarget: PrintTarget,
  compoundName: string | undefined,
  exportLabel: typeof exportLabelPng,
): Promise<{ ok: true } | { ok: false; error: string }> {
```

`src/shared/result.ts` defines exactly `{ ok: true; value: T } | { ok: false; error: E }` plus `map` / `andThen` / `unwrapOr`. These three modules re-declare the same discriminated union inline with a renamed payload (`document`, `issues`, or an omitted value), so none of the shared combinators can be applied to them. The inconsistency is visible inside one call chain: `validateDesignDocument` builds a bespoke union while the element validator it delegates to (`elementValidators/elementValidatorRegistry.ts`, read via `result.ok` / `result.value` at `validateDesignDocument.ts:246-252`) returns a real `Result`.

- **Severity:** Compliance violation
- **Recommended change:** Return `Result<DesignDocument, DesignDocumentValidationIssue[]>` and `Result<void, string>` respectively, importing from `src/shared/result.ts`. Reserve bespoke unions for cases that genuinely carry more than a value and an error.

---

### Novel: the ESLint layer rules do not cover the layers the standard names

- **Standard violated:** `docs/CODE-QUALITY.md` section F — enforced module boundaries
- **Location:** `eslint.config.js:78-109`
- **Evidence:**

```js
  // Layer: domain modules stay pure — no React, no platform adapters, no JSX.
  // Listed last so it wins over feature-level no-restricted-imports for domain paths.
  {
    files: ['src/**/domain/**/*.{ts,tsx}'],
```

Section A's layer table names the domain layer as "`peptideMath.ts`, `LabelMathResolver.ts`, value objects" and the composition layer as "`LabelComposer.ts`, `LabelLayoutEngine.ts`". None of those files live under a `domain/` directory — they sit directly in `src/features/label/` — so the purity rule applies to none of them. There is also no `no-restricted-imports` block for `src/print/**`, `src/app/**`, or `src/platform/**` at all, so the table's strongest claim ("infrastructure… is called, it does not call up into UI") is enforced by nothing. Section F opens by saying the rules "are only real if something other than habit enforces them"; today habit is what enforces them for the modules that matter most.

A live consequence is the next finding.

- **Severity:** Compliance violation
- **Recommended change:** Either move `peptideMath.ts`, `LabelMathResolver.ts`, `LabelComposer.ts` and `LabelLayoutEngine.ts` under `domain/` and `composition/` directories so the existing globs bite, or list them explicitly. Add a block forbidding `src/platform/**` and `src/print/**` from importing `src/features/**`, and forbid `.tsx` imports from `src/print/**`.

---

### Novel: a composition-layer metrics module imports React

- **Standard violated:** `docs/CODE-QUALITY.md` section A — separation of responsibilities; section G — mixed concerns
- **Location:** `src/features/label/labelTypography.ts:1-2,70-76`
- **Evidence:**

```ts
import type { CSSProperties } from 'react'
import { cssVars } from '../../shared/cssVars'
...
/** Emit every {@link LABEL_TYPOGRAPHY} metric as a CSS custom property on the label container. */
export function labelTypographyCssVars(): CSSProperties {
```

`labelTypography.ts` owns the seven fit-prediction metrics and is imported by `LabelLayoutEngine.ts:3` and `qrRenderSize.ts:2` — composition-layer modules whose stated permission is "may depend on Domain". Because it also owns the React-shaped emitter for the preview, the layout engine that `.cursor/rules/domain-label-architecture.mdc` treats as core math now has React on its type-import graph. The import is type-only, so nothing ships in the bundle, but the module is doing two jobs — "these are the numbers" and "here is how React renders them" — and it is precisely the module the previous review's TypeScript/CSS-mirroring fix created.

Three non-`.tsx` modules import React types in total: `labelTypography.ts:1`, `src/shared/cssVars.ts:1`, and `src/features/label/components/formStyles.ts:1`. Only the first sits on a domain/composition import path, so only the first is a boundary problem — but none of the three is caught by the lint rule, because the rule keys on `src/**/domain/**` (see the previous finding).

- **Severity:** Stylistic debt
- **Recommended change:** Split the React-facing emitter (`labelTypographyCssVars`, `CSS_VAR_UNIT`, and the `CSSProperties` return type) into a `labelTypographyCssVars.ts` next to `LabelPreview.tsx`, leaving `LABEL_TYPOGRAPHY` and `labelTypographyCssVarName` as a pure constants module. The drift-detection test can keep importing both.

---

### Novel: a strategy reads another strategy's mode id, so the registry does not close the extension point

- **Standard violated:** `docs/CODE-QUALITY.md` section A — SOLID, open/closed; section G — shotgun surgery
- **Location:** `src/features/label/domain/roundConcentrationSolve.ts:42`; `src/features/label/calculatorModeSwitch.ts:76-78,86,123`; `src/features/label/calculatorGuards.ts:80,87`; `src/features/label/useCalculatorViewModel.ts:140-142`; `src/features/label/components/useSidebarSectionsViewModel.ts:97-98,113`
- **Evidence:**

```ts
        const generatedDrawSource = draft.calculatorSolveMode === 'target_units' && draft.protocolUnitsOrigin === 'recommended'
```

`solveStrategy.ts:79-83` states the design contract plainly: "The reducer looks up exactly one strategy per event; **no other module branches on `calculatorSolveMode` again**." Six production modules still do. The registry itself is well built — `calculatorReducer.ts` genuinely never branches on mode — but the branching migrated outward rather than disappearing.

The line above is the one that matters: `RoundConcentrationSolve` inspects whether the *outgoing* mode was `target_units`. A strategy naming a sibling by id is exactly the coupling the Strategy pattern exists to remove, and it means adding a fourth solve mode requires editing an existing strategy, not just adding a file plus a registration — the open/closed test in section A. The others are display precedence (`calculatorModeSwitch.ts`) and per-mode field visibility (the two view models), which are more defensible as presentation concerns but still put a fourth mode's cost at five or six files.

One is a correctness concern rather than a structural one: `calculatorGuards.ts:80-87` re-derives required water per mode independently of `SolveStrategy.deriveMath`, so the vial-capacity warning and the calculator compute the same quantity through two code paths that nothing forces to agree.

- **Severity:** Compliance violation
- **Recommended change:** Remove the cross-mode read first — `protocolUnitsOrigin === 'recommended'` already carries the fact the line needs ("is this draw-units value system-generated?"), so the mode comparison is redundant. Then decide whether display precedence and field visibility become `SolveStrategy` members or are explicitly exempted as UI, and say which in the interface doc comment. Have `calculateRequiredWaterMl` call the strategy's `deriveMath` rather than re-deriving.

---

### Novel: an orphaned barrel that re-exports eleven modules and is imported by nothing

- **Standard violated:** `docs/CODE-QUALITY.md` section C — no dead code; section F — enforced module boundaries
- **Location:** `src/print/index.ts`
- **Evidence:**

```ts
export * from './types'
export * from './dimensions'
export * from './printCatalog'
...
```

A repo-wide search for any import of `src/print` as a directory (`from '../print'`, `from '../../print'`, `from './print'`) returns zero matches — every consumer imports the specific module it needs (`PrintTargetBanner.tsx:1-3` is the example). The barrel is dead code, and it is dead code of a specific harmful kind: `export *` over eleven modules means anyone who does reach for it pulls `printStorage.ts` — and therefore `LocalStorageKeyValueStore` and `localStorage` — into the module graph of whatever imported it, including a domain module that only wanted `mmToPx`. The heuristic for section F names this exact shape ("barrel files that pull in side effects just by being imported").

- **Severity:** Stylistic debt
- **Recommended change:** Delete `src/print/index.ts`. Nothing imports it, so `npm run build` and `npm run test:run` will not notice.

---

### Novel: the interface-segregation example in the standard describes a type that no longer exists

- **Standard violated:** `docs/CODE-QUALITY.md` section G — stale comment; the doc's own "Keep examples current" rule
- **Location:** `docs/CODE-QUALITY.md:40`; `src/features/label/qrRenderSize.ts:11-21`
- **Evidence:**

```md
For instance, `computeQrRenderSizePx` in `qrRenderSize.ts` takes a whole `QrRenderLayoutModel` typed with `readonly unknown[]` fields just to read two array lengths — the caller shape forced a wide, unsafe parameter.
```

```ts
export interface QrRenderSizeInput {
  qrColumnWidthPercent: number
  qrCodeCount: number
  testIndicatorCount: number
  ...
}

/** @deprecated Use {@link QrRenderSizeInput}. */
export type QrRenderLayoutModel = QrRenderSizeInput
```

The fix landed: the parameter is now a narrow, fully-typed `QrRenderSizeInput` with explicit counts, and there is no `unknown[]` anywhere in the file. The standard still presents the old shape as the current state of the code, in the section that teaches interface segregation — so a reader learning the principle from this document is sent to a file that contradicts it. The doc's own maintenance rule says to update a citation "once a phase fixes an example cited here… rather than leaving a stale 'here is the bug' example that no longer exists in the code."

Separately, the `QrRenderLayoutModel` alias kept for the migration has zero consumers anywhere in the repository — another instance of the alias-instead-of-rename smell proposed below, and dead code in its own right.

- **Severity:** Stylistic debt
- **Recommended change:** Rewrite the section A bullet to cite `QrRenderSizeInput` as the fixed form (the doc's stated convention), and delete the unused `QrRenderLayoutModel` alias.

---

### Novel: a dead value-object layer, with tests that exist only to exercise it

- **Standard violated:** `docs/CODE-QUALITY.md` section G — speculative generality ("a test written only to exercise unused generality is the same smell in test form"); section A — design pattern policy
- **Location:** `src/features/label/domain/units.ts:10-97,112-129`; `src/features/label/domain/units.test.ts`
- **Evidence:**

```ts
export type Mass = {
  readonly value: number
  readonly unit: MassUnit
  readonly __brand: 'Mass'
}
...
export function makeMass(value: number, unit: string): Result<Mass, string> {
```

```ts
/** Convert draw volume in ml to insulin syringe units. */
export function mlToDrawUnits(volumeMl: number): number {
  return volumeMl * UNITS_PER_ML
}
```

A repo-wide search for `makeMass|makeVolumeMl|makeConcentrationPerMl|makeDrawUnits|makeVialCapacityMl|makeSyringeCapacityMl` returns hits in exactly two files: `units.ts` where they are declared, and `units.test.ts` where they are asserted. No production module constructs a single one of these six branded types. The four conversion helpers `mlToDrawUnits`, `drawUnitsToMl`, `mcgToMg`, `mgToMcg` have no consumers at all — `npm run test:coverage` reports `units.ts` lines 114-128 uncovered and functions at 73.33%, the only sub-90% function figure in the whole `domain/` folder.

This is aggravating rather than neutral, because section G's prescribed fix for primitive obsession is "a small value object that owns its own validation and formatting". Those value objects were built and then not adopted, so the codebase now carries both the primitive obsession *and* the unused abstraction: `peptideMath.ts:246` still writes `vol * UNITS_PER_ML` inline and `peptideMath.ts:240` still writes `i.protocolAmount * MCG_PER_MG` inline, duplicating the four dead helpers' bodies. `units.test.ts` contributes 21 of the suite's 593 tests and asserts nothing a user or another module can observe.

The sharpest illustration is `VialCapacityMl`, which is declared twice under one name:

```ts
// domain/units.ts:32 — branded, validated by makeVialCapacityMl, never constructed
export type VialCapacityMl = {
  readonly value: number
  readonly __brand: 'VialCapacityMl'
}
```

```ts
// print/vialCapacity.ts:1-11 — the one every consumer actually imports
export type VialCapacityMl = number

export function normalizeVialCapacityMl(value?: number): VialCapacityMl {
  return Number.isFinite(value) && value! >= MIN_VIAL_CAPACITY_ML
    ? value!
    : DEFAULT_VIAL_CAPACITY_ML
}
```

The live definition is a bare alias that provides no protection at all, and its three-line body carries the only two non-null assertions I found in the print layer (`Number.isFinite(value)` does not narrow `number | undefined`, so `value!` is papering over that). A reader who greps `VialCapacityMl` finds two different declarations of the same product term.

- **Severity:** Stylistic debt (large)
- **Recommended change:** Decide one way. Either adopt the value objects at the parse boundaries the codebase already has (`parseCalculatorModeInput`, `normalizeVialCapacityMl`, `parseSyringeCapacityMl`) so `ParsedLabelMathInput` carries `Mass` / `VolumeMl` / `DrawUnits` instead of bare `number`s — which would also close the primitive-obsession entry — or delete all six factories, all four conversion helpers, the branded types, and their tests, and route the inline conversions through `UNITS_PER_ML` / `MCG_PER_MG` as they already are. Carrying both is the worst of the three options. Either way, one `VialCapacityMl` should survive.

---

### Novel: a redundant guard, and mg/IU disagreeing on sub-unit draws

- **Standard violated:** `docs/CODE-QUALITY.md` section G — duplicated logic; section C — no dead code
- **Location:** `src/features/label/peptideMath.ts:345-353`
- **Evidence:**

```ts
    if (unitWorld.vialUnit === 'IU') {
        const units = scaleDrawUnitsForAmount(protocolAmount, DEFAULT_DRAW_UNITS_PER_IU, DEFAULT_DRAW_UNITS_PER_IU_REDUCED);
        return units > 0 ? units : DEFAULT_DRAW_UNITS_PER_IU;
    }
    const amountMg = unitWorld.measureUnit === 'mg' ? protocolAmount : protocolAmount / MCG_PER_MG;
    const units = scaleDrawUnitsForAmount(amountMg, DEFAULT_DRAW_UNITS_PER_MG, DEFAULT_DRAW_UNITS_PER_MG_REDUCED);
    if (units <= 0) return DEFAULT_DRAW_UNITS_PER_MG;
    if (units < 1) return DEFAULT_DRAW_UNITS_PER_MG;
    return units;
```

Two problems in eight lines. First, line 351 is fully subsumed by line 352 — any value satisfying `units <= 0` also satisfies `units < 1`, so the branch can never be the one that fires. Coverage confirms it: the v8 report lists 351 among `peptideMath.ts`'s uncovered lines, and it is unreachable-as-distinct rather than merely untested.

Second, the two unit worlds disagree. For a protocol amount that scales to a draw between 0 and 1 unit (e.g. 0.05 mg → 0.5 units), the mg branch discards the computed value and returns the flat `10`, while the IU branch returns `0.5` unchanged. Nothing in `docs/FRD.md` distinguishes the two worlds here — it says the 10-units-per-mg policy applies "per mg, or per IU" throughout. Whichever behavior is correct, one of the branches is wrong.

- **Severity:** Bug
- **Recommended change:** Delete line 351. Then extract the shared tail (`scaleDrawUnitsForAmount` → sub-1 floor → return) into one helper both branches call with their own rate constants, so the two worlds cannot drift again, and add a test pinning the chosen sub-1-unit behavior for both.

---

### Novel: designs restored from IndexedDB skip the validator that imported files must pass

- **Standard violated:** `docs/CODE-QUALITY.md` section B — make illegal states unrepresentable; section D — recoverable failure UX
- **Location:** `src/platform/IndexedDbDesignLibrary.ts:41-51`; `src/features/customDesign/useDesignLibrary.ts:37-48`
- **Evidence:**

```ts
  async list(): Promise<TDocument[]> {
    const db = await openDesignLibraryDb()
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const rows = await idbRequest(store.getAll())
      return (rows as TDocument[]).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
```

```ts
  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setDesigns(await library.list())
```

A design document arriving from a file goes through `readDesignPackageFile` → `validateDesignDocument`, which checks the schema version, every slot, every asset, every element, and rejects dangling references and external image URLs — 254 lines of it, and the UI surfaces the specific issues per `docs/FRD.md`. The same document read back out of IndexedDB is `as TDocument[]` and lands directly in React state. The two paths carry the same data with opposite trust levels.

Two concrete consequences. `sort` calls `b.updatedAt.localeCompare(...)`, which throws a `TypeError` if any stored row predates that field — the resulting rejection is caught in `useDesignLibrary` and shown as "Couldn't load your local design library", so one malformed row makes the entire library inaccessible with no way to identify or remove it. And `DB_VERSION` is pinned at `1` with an `onupgradeneeded` that only creates the store, so there is no migration path if `DESIGN_DOCUMENT_SCHEMA_VERSION` advances — persisted designs would silently render against a newer element schema they were never validated for.

- **Severity:** Bug (latent; requires a stored document from a different app version)
- **Recommended change:** Run `validateDesignDocument` over each row in `list()` / `get()`, dropping (and counting) invalid rows rather than failing the whole read, so a stale document costs the user one design instead of the library.

---

### Novel: the duplicate-export guard reports a download failure that did not happen

- **Standard violated:** `docs/CODE-QUALITY.md` section D — recoverable failure UX
- **Location:** `src/app/useLabelExport.ts:40-48`; `src/app/exportLabelToPng.ts:4`
- **Evidence:**

```ts
      if (isExporting) {
        return { ok: false, error: LABEL_EXPORT_ERROR_MESSAGE }
      }
```

```ts
export const LABEL_EXPORT_ERROR_MESSAGE = 'Couldn’t download the label. Try again.'
```

`docs/FRD.md:117` promises the download "prevents duplicate export attempts, and reports a recoverable failure instead of leaving the interface stuck" — two separate behaviors. The code collapses them: a second click while an export is in flight returns the same string the real rasterization failure returns, telling the user their download failed when in fact it was correctly deduplicated and the first one is still running.

Related: this guard is the second one on the same condition. `useLabelStageViewModel.ts:38` already short-circuits on `isExporting` before calling `exportPng`, so through the structured designer this branch is unreachable — two guards, one of which returns a misleading message when it does fire.

- **Severity:** Bug (minor, user-visible)
- **Recommended change:** Return a distinct result for the in-flight case (or return `{ ok: true }` and let the caller no-op), and keep `LABEL_EXPORT_ERROR_MESSAGE` for genuine failures. Then delete whichever of the two guards is redundant.

---

### Novel: coverage excludes every view-model hook that has its own test file

- **Standard violated:** `docs/CODE-QUALITY.md` section E — coverage as a ratchet
- **Location:** `vite.config.ts:25-41`
- **Evidence:**

```ts
        // Humble React wrappers (Phase 5): hold only React state / DOM wiring; the
        // logic they call is unit-tested elsewhere (ports, use cases, pure helpers).
        // Pure helpers live in sibling modules (e.g. applyDesignOperations.ts) that stay included.
        'src/features/customDesign/useApplyDesignViewModel.ts',
        'src/features/customDesign/useDesignLibrary.ts',
        ...
        'src/features/label/useCalculatorViewModel.ts',
        'src/features/label/components/useSidebarSectionsViewModel.ts',
        'src/features/label/components/usePrintSetupSectionViewModel.ts',
```

The justification says these modules hold only wiring and that their logic is tested elsewhere. Five of them have dedicated test files that test them directly, contributing 69 of the suite's 593 tests: `useApplyDesignViewModel.test.ts` (22), `useCalculatorViewModel.test.ts` (17), `useSidebarSectionsViewModel.test.ts` (15), `usePrintSetupSectionViewModel.test.ts` (13), `useLabelStageViewModel.test.ts` (2). They are not humble wrappers by the codebase's own standard — `useCalculatorViewModel.ts` is 154 lines and `useApplyDesignViewModel.ts` is 207.

The effect is that the ratchet cannot see them. Section E says the threshold "exists to catch a regression"; a regression introduced in 500+ lines of tested view-model code moves no number in `vite.config.ts`, and the tests that would have caught it earn no credit. The exclusion also understates the project's real coverage.

- **Severity:** Compliance violation
- **Recommended change:** Remove the five directly-tested hooks from the exclusion list, re-measure, and ratchet the thresholds to the new floor in the same commit (the file's own convention). Keep excluding the genuinely untested wrappers (`useDialogAccessibility.ts`, `usePrintSetup.ts`, `useAgreementGate.ts`) and revisit the comment so it describes what is actually excluded.

---

### Novel: only one calculator event lacks vial capacity, and the reducer fills in the global default

- **Standard violated:** `docs/CODE-QUALITY.md` section B — make illegal states unrepresentable
- **Location:** `src/features/label/calculatorReducer.ts:18,76-77`
- **Evidence:**

```ts
    | { readonly type: 'WaterChanged'; readonly value: string }
```

```ts
        case 'WaterChanged':
            return applyCurrentModeFieldEdit(state, { kind: 'water', value: event.value }, DEFAULT_VIAL_CAPACITY_ML)
```

Eight of the nine `CalculatorEvent` variants carry `vialCapacityMl`; `WaterChanged` alone does not, and the reducer substitutes the module default. The file's own header comment (lines 9-14) states the design intent: "`vialCapacityMl` is threaded explicitly (never closed over) so the reducer stays a pure function of `(state, event)`". This one case violates that by reaching for a constant instead.

It is currently harmless — all three strategies return `{}` from `recommendDefaults` for `field === 'water'` and none uses capacity in the water path — but that is a property of today's three strategies, not of the contract. A fourth strategy, or a change to any existing one, that wants to recommend against the user's actual vial capacity on a water edit would silently compute against 3 ml regardless of what the user selected. Section B's test is whether the type permits a state the domain forbids: an event that cannot express the capacity it will be evaluated against does.

- **Severity:** Stylistic debt (latent)
- **Recommended change:** Add `readonly vialCapacityMl?: number` to `WaterChanged` and thread it like every sibling, or lift the field out of the union into a second reducer parameter so it cannot be omitted for one case.

---

### Novel: stale forward-looking comments referencing a closed phase

- **Standard violated:** `docs/CODE-QUALITY.md` section C — comments explain a constraint, never what changed or when; section G — stale comment
- **Location:** `src/features/label/labelModel.ts:12-15,23-27`
- **Evidence:**

```ts
/**
 * Parse a leading numeric prefix from a display string.
 * Phase 2 removes this once value and unit are separate typed fields.
 */
export function parseNumericDisplayPrefix(raw: string): number | undefined {
```

```ts
 * Delegates suffix formatting to {@link formatDrawUnitsLabel}.
 * Phase 2 removes the regex prefix-parse once value and unit are separate fields.
 */
```

`docs/TECH-DEBT.md:14` records Phase 2 as closed on 2026-08-02, and the repository is now past Phase 7. Both comments assert a removal that did not happen, so a reader is told the function is on its way out when it is in fact the current design. Section C's rule is that a comment describing an edit "stops being true the next time someone edits the line, because nothing forces it to be updated" — these are the worked example.

(`useCalculatorViewModel.ts:100` carries a similar "(Phase 2)" aside. The "Phase 1/2/3" comments in `TitleBodyFitter.ts:125,139,157` are algorithm steps, not project phases, and are fine.)

- **Severity:** Stylistic debt
- **Recommended change:** Either delete the sentences (leaving the description of what the function constrains), or, if the intent still stands, move it to `docs/TECH-DEBT.md` where deferred work is tracked per `future-work-tracking.mdc`.

---

### Novel: file-input helper text is not wired to the input, against the project's own rule

- **Standard violated:** `docs/CODE-QUALITY.md` section F — accessibility as a standing requirement
- **Location:** `src/features/label/components/FormInputs.tsx:186-201`
- **Evidence:**

```tsx
                    <input
                        id={inputId}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="dropzone-input"
                        disabled={isReading}
                        aria-busy={isReading}
                    />
                    <div className="dropzone-text">
                        {isReading ? 'Reading image…' : 'Click to browse or drop image'}
                    </div>
                    <div className="dropzone-subtext">Ideal ratio: 1:2 (Portrait) or 1:1 (Square)</div>
```

`.cursor/rules/ui-web-standards.mdc` states: "file inputs that have helper text should wire `aria-describedby` to that text." This file input has two lines of helper text and no `aria-describedby`, so a screen-reader user gets the label and busy state but never the aspect-ratio guidance or the browse/drop affordance. `ApplyDesignView.tsx:201` does it correctly (`aria-describedby="apply-design-file-formats"`) and is the only `aria-describedby` in the codebase — so the pattern exists and was simply not applied to the other file input.

The rest of the accessibility sweep was clean: `useId()`/`htmlFor` pairing on every labelled control in `FormInputs.tsx`, `role="dialog"` plus `useDialogAccessibility` focus trapping on both modals, `role="alert"` on every error surface, `role="group"` with `aria-label` on every chip/segment row, `aria-expanded` on accordion buttons, `aria-busy` on export.

- **Severity:** Compliance violation
- **Recommended change:** Give the two helper `<div>`s ids and reference them from the input's `aria-describedby`, matching `ApplyDesignView.tsx:201`. Consider adding `eslint-plugin-jsx-a11y` — section F calls accessibility "checked continuously", and nothing mechanical checks it today.

---

### Novel: two import paths for the same symbol, via pure re-export shims

- **Standard violated:** `docs/CODE-QUALITY.md` section C — one source of truth for every fact
- **Location:** `src/features/label/useLabelExport.ts:1-8`; `src/features/label/exportLabelToPng.ts`; `src/features/label/useLabelStageViewModel.ts:2-3`
- **Evidence:**

```ts
/** Re-export from app so label feature code can keep a short relative import. */
export {
  useLabelExport,
  LABEL_EXPORT_ERROR_MESSAGE,
  exportLabelToPng,
  type UseLabelExportOptions,
  type LabelExportState,
} from '../../app/useLabelExport'
```

```ts
import { exportLabelPng } from '../../app/exportLabelPng'
import { useLabelExport } from './useLabelExport'
```

Two shim modules exist solely to shorten an import path, giving every symbol two importable locations. The stated rationale does not survive its own primary consumer: `useLabelStageViewModel.ts` reaches for the long path on line 2 and the short path on line 3, in adjacent lines. `useLabelStageViewModel.ts:21-22` then adds a third hop, re-exporting `exportLabelToPng` again "for existing tests". Three redirections for one function makes it harder, not easier, to find where the behavior lives.

- **Severity:** Stylistic debt
- **Recommended change:** Delete both shims and import from `src/app/` directly — five call sites at most. If short paths matter, add a `@app/*` tsconfig path alias, which solves it once for the whole repo instead of per-module.

---

### Novel: the legacy vial-capacity fallback is repeated at five call sites after migration already removed it

- **Standard violated:** `docs/CODE-QUALITY.md` section C — one source of truth; section G — shotgun surgery
- **Location:** `src/print/PrintTargetResolver.ts:31,44,52`; `src/print/PrintCatalogFilter.ts:63`; `src/features/customDesign/useApplyDesignViewModel.ts:105,107`
- **Evidence:**

```ts
      vialCapacityMl: normalizeVialCapacityMl(selection.vialCapacityMl ?? selection.vialMl),
```

```ts
  const vialCapacityMl = selection.vialCapacityMl ?? selection.vialMl
```

`printStorage.ts:47-52` already migrates the deprecated `vialMl` into `vialCapacityMl` on load and drops the legacy key, and `src/print/types.ts:42-43` marks it `@deprecated Legacy; migrated to vialCapacityMl on load`. Five further sites still perform the fallback defensively — three of them inside one 74-line file. Retiring the legacy field now means finding and editing all five; that is the shotgun-surgery smell against a field the codebase has already declared migrated.

- **Severity:** Stylistic debt
- **Recommended change:** Make `normalizePrintSetup` the single migration point (it already is), have every consumer take a normalized `PrintSetupSelection`, and delete the five `?? selection.vialMl` expressions. Then the field can be dropped from the type in one edit.

---

### Novel: `IndexedDbDesignLibrary.get()` defends against shared references, `list()` does not

- **Standard violated:** `docs/CODE-QUALITY.md` section B — immutability by default
- **Location:** `src/platform/IndexedDbDesignLibrary.ts:47,59`
- **Evidence:**

```ts
      return (rows as TDocument[]).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
```

```ts
      return row ? structuredClone(row as TDocument) : null
```

Two methods on the same class, reading the same store, with different defensive-copy policies: `get` deep-clones, `list` copies only the array spine and hands out the row objects themselves. Nothing in the class explains why the two should differ, and nothing depends on the difference. It is the kind of asymmetry that reads as an oversight to the next maintainer, who then cannot tell which one expresses the intended contract.

- **Severity:** Stylistic debt
- **Recommended change:** Pick one and state it on the `DesignLibrary` port — since IndexedDB already deserializes fresh objects on every read, dropping the `structuredClone` in `get` and documenting "reads return fresh objects" is the cheaper of the two.

---

### Novel: strictness flags that would have caught findings in this review are off

- **Standard violated:** `docs/CODE-QUALITY.md` section B — make illegal states unrepresentable
- **Location:** `tsconfig.app.json:19-25`
- **Evidence:**

```json
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
```

`strict` is on, which is the majority of the value. But `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are both off, in a codebase whose central model (`LabelModelInput`) is an intersection of nine interfaces of almost entirely optional fields, and whose validator does array-index and record-key access on untrusted JSON. `exactOptionalPropertyTypes` in particular is the flag that distinguishes "field absent" from "field explicitly `undefined`" — the distinction section B is asking for when it says a mode-inapplicable field being present should not be representable.

- **Severity:** Stylistic debt
- **Recommended change:** Turn both on and fix the fallout in a dedicated change set; `noUncheckedIndexedAccess` first, since it is the cheaper of the two on this codebase.

---

### Novel: the immutability standard describes a state the code left behind, and a fix that never landed

- **Standard violated:** `docs/CODE-QUALITY.md` section C — one source of truth (documentation accuracy); the doc's own "Keep examples current" rule
- **Location:** `docs/CODE-QUALITY.md:88`
- **Evidence:**

```md
Today: zero runtime freezing anywhere in `src/`; `PRINT_CATALOG` uses `as const` for compile-time literal narrowing only, which does not stop a runtime mutation of an array element. For instance, Phase 1 adds `Object.freeze` to exported constant catalogs and switches domain types to `readonly` fields so a caller cannot silently mutate a shared object and corrupt state for every other caller holding a reference to it.
```

Both halves are now wrong in different directions. `Object.freeze` appears three times in `src/` (`calculatorPresets.ts:12`, `calculatorModeSwitch.ts:46`, `domain/solveStrategy.ts:84`), so "zero runtime freezing" is stale. And `PRINT_CATALOG` — the one catalog the paragraph names — is still unfrozen (see the recurrence below), so the "Phase 1 adds" claim describes work that did not complete. The doc's closing section says to update a citation "once a phase fixes an example cited here"; here the citation was left describing a fix that half-shipped.

- **Severity:** Stylistic debt
- **Recommended change:** Update the paragraph to state what is actually frozen, and move the unfinished `PRINT_CATALOG` freeze into `docs/TECH-DEBT.md` where incomplete work belongs, rather than leaving it implied by a standards document.

---

## Recurrences

### Recurrence: `PRINT_CATALOG` was never frozen, and one accessor still hands out live references

- **Standard violated:** `docs/CODE-QUALITY.md` section B — immutability by default
- **Location:** `src/print/printCatalog.ts:77-131`; `src/print/PrintCatalogFilter.ts:44-52`
- **Evidence:**

```ts
export const PRINT_CATALOG = {
  stocks: [ ... ] as const satisfies readonly LabelStock[],
  printers: [ ... ] as const satisfies readonly Printer[],
  vialRecommendations: [ ... ] satisfies readonly VialRecommendation[],
} as const
```

```ts
export function getPrinterById(id: string): Readonly<Printer> | undefined {
  const printer = PRINT_CATALOG.printers.find((p) => p.id === id)
  if (!printer) return undefined
  // Live catalog identity is fine under Readonly; copy arrays so a caller cast-mutation cannot poison PRINT_CATALOG.
  return { ...printer, labelIds: [...printer.labelIds] }
}
```

```ts
  const printers =
    printerSpecs.length === 0
      ? [...PRINT_CATALOG.printers]
      : PRINT_CATALOG.printers.filter(and(...printerSpecs))
```

`getPrinterById` and `getStockById` take the threat seriously enough to copy the nested arrays and to write a comment about cast-mutation. `filterCatalog`, on the same data, copies only the outer array — every `Printer` and `LabelStock` object it returns, and every `labelIds` / `printerIds` array inside them, is the live catalog object. A single `as` cast anywhere downstream (and the codebase uses casts freely — see `validateDesignDocument.ts`) reaches straight into module state shared by every consumer.

- **Severity:** Bug (latent)
- **Recommended change:** `Object.freeze` `PRINT_CATALOG` and each of its three arrays and their elements (a small `deepFreeze` helper, or `Object.freeze` at each literal). That makes the copying in `getPrinterById` unnecessary and removes the asymmetry with `filterCatalog` in one move.
- **Matches `known-findings.md`:** "A getter handing out elements of a shared catalog". That entry ends with an explicit instruction: *"confirm on next review that the freeze actually landed and covers every exported catalog, not just the ones touched first."* It did not land on `PRINT_CATALOG` — the exact catalog the entry was written about. Three unrelated constants were frozen instead. This is a fix that regressed at the planning stage rather than in code, and should be flagged as such.

---

### Recurrence: `parseNumericField` still returns `0` for unparseable input

- **Standard violated:** `docs/CODE-QUALITY.md` section D — one error convention
- **Location:** `src/features/label/peptideMath.ts:122-130`
- **Evidence:**

```ts
export function parseNumericField(value?: string): number {
    const source = value || '';
    const match = source.match(/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match) return 0;
    const remainder = source.slice(match[0].length).trim();
    if (/^[.\deE+-]/.test(remainder)) return 0;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : 0;
}
```

Three separate failure modes — no numeric prefix, trailing junk, non-finite result — all collapse to `0`, indistinguishable from a user who genuinely typed `0`. The same pattern runs through `parseLabelMathInput` (`domain/labelMathCore.ts:40-44`), where every field is `parseFloat(input.x || '0')`. Downstream, `hasCompoundAmount` and friends test `> 0`, so today a parse failure and a zero take the same path — but that equivalence is a coincidence of the current guards, not a contract, and this is safety-critical dosing-adjacent math where "we could not read this number" and "this number is zero" are different facts.

- **Severity:** Compliance violation
- **Recommended change:** Return `Result<number, string>` (or `number | null`) from `parseNumericField` and let each caller decide, rather than deciding for all of them that unparseable means zero.
- **Matches `known-findings.md`:** "A parse function returning a sentinel for unparseable input". That entry says "confirm which specific parse functions still do this on next review" — the answer is `parseNumericField`, plus every `parseFloat(x || '0')` site in `labelMathCore.ts`. `Result<T, E>` shipped in Phase 1 but was never applied here.

---

### Recurrence: one constant serving as both a per-mg rate and a flat placeholder

- **Standard violated:** `docs/CODE-QUALITY.md` section C — one source of truth; section G — magic number
- **Location:** `src/features/label/peptideMath.ts:58,180-195,351-352`
- **Evidence:**

```ts
export const DEFAULT_DRAW_UNITS_PER_MG = 10;
```

```ts
/** Draw-unit default for Set Draw Volume: flat 10 until compound amount is known, then 10 units per mg/IU. */
export function resolveDefaultDrawUnitsLabel(
    ...
    if (!hasPositiveCompoundAmount(compoundAmount)) {
        return formatDrawUnitsLabel(DEFAULT_DRAW_UNITS_PER_MG);
    }
```

`DEFAULT_DRAW_UNITS_PER_MG` is a *rate* — units per milligram. At line 190 it is used as an *absolute quantity*: the flat 10-unit placeholder shown before compound amount is known, which `docs/FRD.md:73` describes as "a flat **10 units** placeholder rather than guessing wrong math". At lines 351-352 it is used as a third thing again: a floor value for a computed draw. The three meanings are equal at 10 today and have no principled reason to stay equal — changing the per-mg rate to 8 would silently change the placeholder and the floor too.

- **Severity:** Compliance violation
- **Recommended change:** Introduce `PLACEHOLDER_DRAW_UNITS = 10` and `MIN_DRAW_UNITS = 10` (or whatever the floor should be) alongside the rate constant, each with its own one-line "why this value".
- **Matches `known-findings.md`:** "A numeric literal carrying two unrelated meanings". The entry notes the original instance was superseded during Phase 1 magic-number naming; this is a fresh instance of the same pattern in the same file, and it carries three meanings rather than two.

---

### Recurrence: layout metrics still mirrored by hand between TypeScript and CSS, in two places the fix did not reach

- **Standard violated:** `docs/CODE-QUALITY.md` section C — one source of truth
- **Location:** `src/features/label/qrRenderSize.ts:58-61` vs `src/features/label/LabelPreview.css:257-264`; `src/features/label/LabelPreview.css:152,333,339,343` (and three more) vs `src/features/label/labelTypography.ts:13-33`
- **Evidence:**

```ts
/** Matches `.qr-text` in LabelPreview.css (2cqw font, 0.2cqw top margin, line-height 1). */
export const QR_CAPTION_FONT_FRAC = 0.02
export const QR_CAPTION_MARGIN_TOP_FRAC = 0.002
export const QR_CAPTION_LINE_HEIGHT = 1
```

```css
.qr-text {
  font-size: 2cqw;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
  margin-top: 0.2cqw;
```

```css
  /* Extra tight to prevent bleeding into the gap. Matches LABEL_TYPOGRAPHY.titleLineHeightEm. */
  line-height: var(--label-title-line-height, 0.95);
```

Two distinct residues of the same pattern, both inside the QR/preview fit prediction the Phase 3 fix was written for.

First, `qrRenderSize.ts` predicts the QR caption's rendered height from three constants that mirror `.qr-text` by hand. A comment is the only thing linking them, which is precisely the mechanism `LABEL_TYPOGRAPHY` was introduced to replace — and it is worse here than in the original instance, because these values feed `computeQrRenderSizePx`, so a purely visual edit to `.qr-text` makes the app predict a QR size the label cannot actually fit. `indicatorsStackHeightPx` (`qrRenderSize.ts:47`) carries the same comment-only link to `line-height: 1.1` at `LabelPreview.css:310`.

Second, every custom property the stylesheet consumes carries a fallback literal — `var(--label-title-line-height, 0.95)`, `var(--label-section-label-em, 0.55)`, `var(--label-content-em, 0.82)`, and four more. `labelTypography.test.ts` pins the module-to-variable mapping but nothing pins the fallbacks, so changing `LABEL_TYPOGRAPHY` leaves seven stale numbers in the stylesheet, silently correct until the day the custom properties do not reach the element.

- **Severity:** Compliance violation
- **Recommended change:** Move the three QR caption constants into `LABEL_TYPOGRAPHY` and have `.qr-text` consume them as custom properties like the other seven. For the fallbacks, either drop them (the element always receives the properties) or extend `labelTypography.test.ts` to parse `LabelPreview.css` and assert each fallback equals its constant.
- **Matches `known-findings.md`:** "A constant mirrored between TypeScript and CSS", recorded as **Resolved 2026-08-02/03 (Phase 3 action 3.5)**. The resolution covered the seven metrics it enumerated and stopped there; the QR caption metrics in the adjacent module, and the CSS fallbacks the fix itself introduced, were never brought in. This is worth flagging as an incomplete fix rather than a fresh finding — the entry should be moved back to open with its scope corrected.

---

## Analogues

### Analogue: two legacy `labelId → stockId` migration tables that disagree

- **Standard violated:** `docs/CODE-QUALITY.md` section C — one source of truth; section G — duplicated logic
- **Location:** `src/print/PrintTargetResolver.ts:70-74`; `src/print/printStorage.ts:64-76`
- **Evidence:**

```ts
function legacyLabelIdToStockId(labelId?: string): string | undefined {
  if (labelId === '40x20') return DEFAULT_STOCK_ID
  if (labelId === '50x30') return '50x30-rounded'
  return undefined
}
```

```ts
  if (migrated.stockId) {
    return catalogSelection
  }

  if (migrated.labelId === '50x30') {
    return { ...catalogSelection, stockId: '50x30-rounded' }
  }

  if (migrated.labelId === '40x30') {
    return { ...catalogSelection, stockId: '40x30-rounded' }
  }

  return { ...catalogSelection, stockId: DEFAULT_STOCK_ID }
```

The same migration is expressed twice with different coverage. `printStorage` handles `50x30` and `40x30` and defaults everything else to `40x20-rounded`; `PrintTargetResolver` handles `40x20` and `50x30` and **not** `40x30`. So `resolvePrintTarget({ labelId: '40x30' })` finds no stock, is then refused by `resolveCustomDimensions` (line 63 bails whenever `labelId` is set), and falls through to `SKIP_DEFAULT_TARGET` — a 40 × 20 mm label where the persistence path would have produced 40 × 30 mm. Given the preview-equals-export promise, a silent label-size substitution is the worst class of divergence this codebase can have.

In the shipped app `usePrintSetup` normalizes before resolving, so the divergence is not currently user-reachable — but `resolvePrintTarget` is exported, is the default in `LabelComposer`'s constructor (`LabelComposer.ts:23`), and accepts a `PrintSetupSelection` whose `labelId` field still exists.

- **Severity:** Bug (latent)
- **Recommended change:** Delete `legacyLabelIdToStockId` and have `resolvePrintTarget` call `normalizePrintSetup` first, so there is one migration table. Add a test asserting every legacy `labelId` value resolves identically through both entry points.
- **Matches `known-findings.md`:** analogue of "A default value declared twice with different values" — same shape (one fact, two hard-coded expressions, drifted apart unnoticed because nothing compares them), in the print-target resolution path rather than in calculator defaults. Worth generalizing that entry from "default value" to "any lookup or mapping table".

---

### Analogue: layout and typography literals inlined in `.tsx` alongside colocated `.css`

- **Standard violated:** `docs/CODE-QUALITY.md` section C — one source of truth; section G — magic number
- **Location:** `src/features/label/components/FormInputs.tsx` (33 inline style objects), `components/SidebarSections.tsx` (26), `components/PrintSetupSection.tsx` (22), `LabelPreview.tsx` (15), and four more files — 109 in total across `src/`
- **Evidence:**

```tsx
    <div style={{ marginBottom: 16 }}>
        <FieldHeader label={label} htmlFor={id} printToggle={printToggle} />
```

```tsx
                <label
                    htmlFor={htmlFor}
                    style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', opacity: printToggle?.disabled ? 0.5 : 1 }}
                >
```

`.cursor/rules/ui-web-standards.mdc` says to use "standard CSS: variables in `src/index.css` and colocated stylesheets", and `docs/TECH-DEBT.md` records action 5.7 as having moved duplicated input styles and hardcoded colors onto tokens. Colors did move — every color above reads a `var(--color-*)` token. Spacing and typography did not: `marginBottom: 16` and `fontSize: '0.85rem'` each recur across several components as bare literals, and the components that carry them also have colocated `.css` files, so there is no rule a reader can apply to predict which of the two places a given value lives in.

- **Severity:** Stylistic debt
- **Recommended change:** Extend the `index.css` token set with spacing and font-size steps, then move the recurring literals into the colocated stylesheets that already exist, leaving inline styles only for values genuinely computed at runtime (the `opacity`/`cursor` ternaries above).
- **Matches `known-findings.md`:** analogue of "A constant mirrored between TypeScript and CSS". Distinct from the recurrence above, which is the same *metrics* still mirrored in the label pipeline. This one is a different population — sidebar and form chrome, where no fit prediction is involved, the values are spacing and type scale rather than layout ratios, and the duplication is between an inline style object and a colocated stylesheet rather than between TypeScript and CSS across a layer boundary. Same failure mode, different neighborhood, and it needs a token set rather than custom properties to fix.

---

### Analogue: a deprecated identifier still readable everywhere the canonical one is

- **Standard violated:** `docs/CODE-QUALITY.md` section C — ubiquitous language
- **Location:** `src/print/types.ts:37-43`
- **Evidence:**

```ts
  /** @deprecated Legacy; migrated to stockId on load. */
  readonly labelId?: string
  readonly widthMm?: number
  readonly heightMm?: number
  readonly vialCapacityMl?: VialCapacityMl
  /** @deprecated Legacy; migrated to vialCapacityMl on load. */
  readonly vialMl?: number
```

`docs/COPY-GUIDELINES.md:39` names `vialCapacityMl` canonical and explicitly warns against using "vial size" when the value means liquid capacity. `PrintSetupSelection` keeps `vialMl` alongside it, both optional, with nothing preventing a value that sets both to different numbers — a state the domain forbids but the type permits. The same applies to `labelId` beside `stockId`. Marking a field `@deprecated` documents the intent but does not remove the second vocabulary, and five call sites still read it (see the shotgun-surgery finding above).

- **Severity:** Stylistic debt
- **Recommended change:** Split the type: a `PersistedPrintSetupSelection` that admits the legacy keys and is only ever consumed by `normalizePrintSetup`, and a clean `PrintSetupSelection` that everything else takes. Then illegal combinations are unrepresentable outside the one function whose job is migration.
- **Matches `known-findings.md`:** analogue of "Identifiers drifting from the product's own vocabulary". The original was resolved by renaming math identifiers onto COPY-GUIDELINES vocabulary; this is the same drift surviving in the print layer, where a rename was replaced by an additive alias.

---

## Per-standard verdict

| Section | Standard | Verdict | Evidence examined |
|---|---|---|---|
| A | Separation of responsibilities | Findings above | Full import graph of `src/` against the section A layer table. Direction is broadly correct: no `.tsx` imports `src/platform` (ESLint enforces it), `label` and `customDesign` do not import each other, browser APIs (`localStorage`, `indexedDB`, `document`, `canvas`, `FileReader`) appear only in `src/platform` plus the two documented storage helpers behind `KeyValueStore`. One violation: `labelTypography.ts` puts a React-typed emitter in a module the composition layer depends on. |
| A | SOLID — Single responsibility | Findings above | Named the job of every module over 150 lines. `validateDesignDocument.ts` ("validate *and* assemble") and `labelTypography.ts` ("metrics *and* CSS emission") need "and"; the rest do not. `LabelComposer.ts` (34 lines) is a clean coordinator. |
| A | SOLID — Open/closed | Findings above | Counted files touched to add a variant: custom-design element kind = 2 (new validator + `elementValidatorRegistry.ts`); print stock = 1 (`printCatalog.ts`) — both meet the standard. Calculator solve mode does not: the registry is clean but six modules still branch on `calculatorSolveMode`, one of them a strategy reading a sibling's id. Label template is 2 (`templates/` + `createLabelTemplate`) but has only one implementation — see design pattern policy. |
| A | SOLID — Liskov | Clean | Read all three `SolveStrategy` implementations, all five element validators, and every port implementation including the test fakes (`src/test/memoryDesignLibrary.ts`, `memoryLocalStorage.ts`). No "not supported" throw and no sentinel meaning "not applicable". `StandardSolve.recommendDefaults` returning `{}` is explicitly sanctioned by the interface contract at `solveStrategy.ts:70-76`, not a silent no-op. |
| A | SOLID — Interface segregation | Clean in code; doc stale | Checked the case CODE-QUALITY.md cites: `computeQrRenderSizePx` now takes a narrow, fully-typed `QrRenderSizeInput` and the `readonly unknown[]` model is gone. No remaining function takes a whole model to read two fields. The standard's own example text was not updated to match — reported above. |
| A | SOLID — Dependency inversion | Clean | Every I/O crossing goes through `src/shared/ports.ts`; `ExportLabelUseCase` depends on three interfaces and is unit-tested with in-memory fakes. Concretions are wired only at `app/exportLabelPng.ts:7-11`. |
| A | Small units, with budgets | Findings above (partly known) | Full line-count sweep of `src/`. Over the module budget: `peptideMath.ts` (368), `validateDesignDocument.ts` (254), `IdentityHeaderTemplate.ts` (253), `LabelLayoutEngine.ts` (239). Over the component budget: `FormInputs.tsx` (268), `ApplyDesignView.tsx` (216), `LabelPreview.tsx` (201), `SidebarSections.tsx` (201), `CalculatorView.tsx` (190), `PrintSetupSection.tsx` (149) — all already tracked in `docs/TECH-DEBT.md` as JSX volume rather than logic, which I confirmed by reading them. Over the function budget: `validateDesignDocument` (112 lines) and `normalizePrintSetup` (31), both already acknowledged. No signature exceeds four parameters except `formatDefaultDrawUnitsLabel` / `resolveDefaultDrawUnitsLabel` (five each, `peptideMath.ts:152,181`) — worth an options object. |
| A | Design pattern policy | Clean, with one note | Verified each declared pattern has a real second implementation: Strategy (3 solve modes), Registry (3 strategies, 5 element validators), Builder (`labelInputBuilder`, `LabelRenderModelBuilder`), Facade (`ExportLabelUseCase`), Adapter (7 platform classes). None of the "not adding" patterns has crept in. Note: `LabelTemplate` has exactly one implementation and `LabelLayoutMode` is a single-member union (`labelModel.ts:2`), which the governing rule warns about — but `docs/FRD.md` "Additional label templates" is a forecast second one, so this reads as justified rather than speculative. |
| B | Illegal states unrepresentable | Findings above | Read every exported type in `labelModel.ts`, `labelRenderModel.ts`, `print/types.ts`, `designDocument.ts`, `shared/ports.ts`. `UnitWorld` (`domain/units.ts:155-168`) is an exemplary application of this standard and is used consistently. Counterexamples found: `PrintSetupSelection`'s paired legacy/canonical optionals, and the `WaterChanged` event that cannot express its own capacity. |
| B | Authored vs. derived | Known — no new finding | `CalculatorState = { authored, derived }` landed (`LabelMathResolver.ts:18-25`) and `mergedInput` is gone. The residual `protocolUnitsOrigin` / `targetConcentrationOrigin` provenance flags (`labelModel.ts:67,79`, written in all three `*Solve.ts` files) are the exact scope recorded as open in `docs/TECH-DEBT.md`; not re-reported as new. |
| B | Immutability by default | Findings above | Counted `Object.freeze`: 3 occurrences. Counted `readonly`: applied consistently across type declarations (all nine `LabelModelInput` sub-interfaces, all of `print/types.ts`, all `CalculatorEvent` variants) but not on `Result` itself (`shared/result.ts:5-7`). Checked every catalog accessor for reference leaks and every `.push`/`.sort`/`.splice` on externally-owned values — `PrintCatalogFilter.ts:74` sorts a fresh `filter()` result (safe); `IndexedDbDesignLibrary.ts:47` slices before sorting (safe). |
| C | Clean code | Findings above | Read every comment in `src/`. No commented-out code blocks anywhere. Empty `catch` blocks: exactly one (`coaLinks.ts:29`), and it carries a comment recording the deliberate decision — correct by the standard. Findings are the two stale "Phase 2 removes this" comments, the dead exports in `domain/units.ts`, the orphaned `print/index.ts` barrel, and the unused `QrRenderLayoutModel` alias. The `/* DECREASED PADDING */` comment CODE-QUALITY.md cites as its example no longer exists. |
| C | One source of truth | Findings above | Diffed `LABEL_TYPOGRAPHY` against `LabelPreview.css` — the Phase 3 custom-property fix holds, and `labelTypography.test.ts` guards it. Remaining duplication: the two migration tables, the five `?? vialMl` fallbacks, the tri-purpose draw-units constant, and the inline-style literals. |
| C | Ubiquitous language | Findings above | Built the product-term → identifier map from COPY-GUIDELINES and grepped each term. Canonical names hold in the math and UI layers (`compoundAmount`, `protocolAmount`, `protocolUnits`, `syringeCapacityMl`, `testGroup`/TG all consistent; `FIELD_LABELS` single-sourced from `uiStrings.ts`). Two deviations: `vialMl` in the print layer, and the banned word in `CODE-QUALITY.md:7`. |
| D | One error convention | Findings above | Enumerated every failure signal in `src/`: `Result` (units factories, `KeyValueStore.set`, `printStorage.savePrintSetup`, `readImageFileAsDataUrl`, element validators), bespoke `{ ok, … }` unions (3 modules), `return null` (`peptideMath.ts` × 5, `calculatorGuards`, `loadPrintSetup`, `DesignLibrary.get`), `return 0` sentinel (`parseNumericField`), `return ''` sentinel (`resolveDefaultDrawUnitsLabel`, `labelMathCore` fallbacks), thrown/rejected (IndexedDB, rasterizer). Six conventions in play against a standard that asks for one. |
| D | Recoverable failure UX | Clean, with one finding | Traced every outside-world operation. Each has all three states and a user-visible failure: PNG export (`isExporting` / `exportError` → `role="alert"` at `LabelStage.tsx:40`), design library (`isLoading` / `error` in `useDesignLibrary.ts`), print setup persistence (`persistError` → `PrintSetupSection.tsx:36`), agreement persistence (`LandingPage.tsx:55`), design import (issue list at `ApplyDesignView.tsx:211`), image upload (`FormInputs.tsx:209`). Every swallowed failure is `console.error`-traced. The one finding is the misleading message on the duplicate-export guard. `WorkspaceErrorBoundary` gives a labelled reload path but wraps only the workspace, not the landing page. |
| E | Behavior over implementation | Clean | Read the assertions in `LabelMathResolver.test.ts`, `calculatorModeSwitch.test.ts`, `peptideMath.edge.test.ts` — the files the known pattern names. All now assert through `displayWaterAmount` / `displayDrawUnits` / `displayConcentration` or on the unit-under-test's own return value. No `result.mergedInput.*`-style reach-ins remain; the field no longer exists. |
| E | Characterization tests | Clean | `LabelComposer.golden.test.ts` runs 42 tests across every catalog stock, and `.cursor/rules/run-tests-core-label-modules.mdc` states the snapshot may not be regenerated with `-u` without sign-off. This is the standard's own worked example, in place and enforced by a rule. |
| E | Test data builders | Clean | `src/features/label/testing/labelInputBuilder.ts` (143 lines) provides named presets and is used across the label test files. No repeated inline `LabelModelInput` literals found; `labelModelFixtures.ts` supplies the shared empty/example inputs. |
| E | Coverage as a ratchet | Findings above | Ran `npm run test:coverage`: 59 files, 593 tests, all passing. Thresholds sit just under measured (90/88/85/89 vs 90.12/88.55/85.73/89.02) with a written rationale in `vite.config.ts:43-46` — correct ratchet discipline. The finding is *what* is excluded, not the thresholds. Also noted: `test.include` is `src/**/*.test.ts`, so a `.test.tsx` file would be silently skipped (none exist today). |
| F | Enforced module boundaries | Findings above | Read `eslint.config.js` in full. Zero `eslint-disable` comments anywhere in `src/` — the rules that exist are genuinely obeyed, not suppressed. The finding is the gap between the globs and the layer table. CI does run `npm run lint` (`deploy.yml:37-38`), so what is covered is covered for real. |
| F | Accessibility | Findings above | Swept every `.tsx`. Labels associated via `useId()`/`htmlFor` throughout `FormInputs.tsx`; both dialogs use `role="dialog"` plus `useDialogAccessibility` focus trapping; `role="alert"` on every error; `role="group"` + `aria-label` on chip rows; `aria-expanded` on accordions; `aria-busy` on export and upload; no click handlers on non-interactive elements. One gap (`aria-describedby` on the image upload) and no automated enforcement. |
| F | ADRs | Clean | `docs/ADR/` holds seven records covering the layering direction (0001), ports/adapters (0002), calculator reducer (0003), label template strategy (0004), the `Result` convention (0005), the snapshot carve-out (0006), and the single-stock pixel reference (0007) — precisely the decisions section F says are most likely to be second-guessed. |
| G | Smell sweep — long function | Findings above | Only `validateDesignDocument` materially exceeds the budget, and it is already tracked. |
| G | Smell sweep — long parameter list | Minor | Two five-parameter signatures in `peptideMath.ts` (152, 181), both taking four same-typed optional strings in a row — the exact shape the catalogue warns about. |
| G | Smell sweep — primitive obsession | Findings above | Every amount, volume, concentration and capacity in the math layer is a bare `number` or `string`. Value objects to fix this exist and are unused — see the `domain/units.ts` finding. |
| G | Smell sweep — god object / god file | Clean | `peptideMath.ts` at 368 lines is the largest source module but is cohesive (parse, format, solve for one domain). No module accumulates unrelated responsibilities. |
| G | Smell sweep — duplicated logic | Findings above | Migration tables, `?? vialMl`, the mg/IU draw-units tails, the four dead conversion helpers duplicated inline. |
| G | Smell sweep — magic number | Findings above | Layout and math constants are well named and colocated (`labelLayoutConstants.ts`, `labelTypography.ts`, `drawUnitsPolicy.ts`). The remaining unexplained literals are in `.tsx` inline styles, plus the tri-purpose draw-units constant. |
| G | Smell sweep — mixed concerns | Findings above | One instance: `labelTypography.ts`. No domain logic found inside a view component — the Phase 5 view-model extraction holds. |
| G | Smell sweep — shotgun surgery | Findings above | Retiring `vialMl` touches six files; adding a fourth calculator solve mode touches six. Adding an element kind or a print stock touches one or two, which is the standard met. |
| G | Smell sweep — speculative generality | Findings above | The `domain/units.ts` value-object layer, with its own test file; the `print/index.ts` barrel; the unused `QrRenderLayoutModel` alias. |
| G | Smell sweep — stale comment | Findings above | Two in `labelModel.ts`, one aside in `useCalculatorViewModel.ts`, and one in `CODE-QUALITY.md:88`. |
| G | Smell sweep — new smell proposed | — | **Alias-instead-of-rename**: a deprecated identifier kept beside its canonical replacement as an optional field, so both are readable indefinitely and every consumer adds a `?? legacy` fallback. Looks like a safe migration; is actually a permanent second vocabulary plus a representable illegal state. Fix: split the legacy shape into a persistence-only type consumed solely by the migration function. Proposed for the section G table. |

---

## Numbers

- `npm run test:coverage` (commit `d7fe106`): **59 test files, 593 tests, all passing**. Lines **90.12%**, statements **88.55%**, branches **85.73%**, functions **89.02%**. Thresholds in `vite.config.ts`: 90 / 88 / 85 / 89 — passing with 0.02–0.73 points of headroom. Weakest measured areas: `src/platform` (30.08% lines — adapters, largely by design), `validateDesignDocument.ts` (54.88%), `useLabelForm.ts` (60%), `domain/units.ts` (88.88%, and the uncovered lines are the dead helpers above). `.tsx` files and eleven hook modules are excluded from measurement entirely.
- **File-size sweep** (non-test source):
  - Functions over 30 lines: **2** — `validateDesignDocument` (112), `normalizePrintSetup` (31). Both already acknowledged in `docs/CODE-QUALITY.md`.
  - Modules over 200 lines: **4** — `peptideMath.ts` (368), `validateDesignDocument.ts` (254), `IdentityHeaderTemplate.ts` (253), `LabelLayoutEngine.ts` (239).
  - Components over 120 lines: **6** — `FormInputs.tsx` (268), `ApplyDesignView.tsx` (216), `LabelPreview.tsx` (201), `SidebarSections.tsx` (201), `CalculatorView.tsx` (190), `PrintSetupSection.tsx` (149). All six are tracked in `docs/TECH-DEBT.md` as JSX volume; re-read and confirmed — the decision logic really has moved to view models.
  - Signatures over four parameters: **2** — `peptideMath.ts:152,181`.
  - `Object.freeze` occurrences: **3**. `eslint-disable` occurrences in `src/`: **0**. Inline `style={{` occurrences: **109** across 8 files. Modules importing React outside `.tsx`: **3**. Barrel files with zero importers: **1**.
- **Finding counts:** **28 total — 21 novel, 4 recurrences, 3 analogues.** By severity: **5 bugs**, **10 compliance violations**, **13 stylistic debt**.

---

## Routing

This review is report-only; nothing below has been written to its destination document yet.

- **To `docs/TECH-DEBT.md`:**
  - `PRINT_CATALOG` never frozen; `filterCatalog` hands out live catalog references — *High* (section B). Note explicitly that this is a Phase 1 action that did not land.
  - Two disagreeing legacy `labelId → stockId` migration tables; `40x30` resolves to the wrong label size through `resolvePrintTarget` — *High* (section C), because it can silently substitute a label size.
  - Designs read from IndexedDB bypass `validateDesignDocument`; one malformed row makes the whole library unreadable — *Medium* (sections B/D).
  - QR caption metrics mirrored by hand between `qrRenderSize.ts` and `LabelPreview.css`, feeding fit prediction; plus seven unpinned CSS fallback literals — *High* (section C). Reopen the "Preview fitting metrics" entry currently in **Resolved** with its scope corrected, rather than filing a new one.
  - Redundant guard at `peptideMath.ts:351` and mg/IU disagreement on sub-1-unit draws — *Medium* (section G).
  - Banned word in `docs/CODE-QUALITY.md:7` — *Medium*, one-line fix; consider a CI grep alongside it.
  - Six modules still branch on `calculatorSolveMode`, including one strategy reading a sibling's id; `calculateRequiredWaterMl` re-derives water independently of `deriveMath` — *Medium* (section A). The second half is the part with correctness exposure.
  - Coverage excludes five directly-tested view-model hooks — *Medium* (section E).
  - `parseNumericField` returns `0` for unparseable input — *Medium* (section D).
  - `DEFAULT_DRAW_UNITS_PER_MG` serving as rate, placeholder, and floor — *Low* (section C).
  - Duplicate-export guard reporting a download failure — *Low* (section D).
  - `aria-describedby` missing on the image upload; no `jsx-a11y` in the lint config — *Low* (section F).
  - Dead code: orphaned `src/print/index.ts` barrel; unused `QrRenderLayoutModel` alias; six unused value-object factories and four unused conversion helpers in `domain/units.ts`; duplicate `VialCapacityMl` declarations — *Low* (sections C/G).
  - Stale "Phase 2 removes this" comments; `CODE-QUALITY.md:88` freeze paragraph and `CODE-QUALITY.md:40` interface-segregation example both out of date — *Low* (section C). These are documentation fixes and should ship with whichever change touches the code they describe.
  - Five duplicated `?? selection.vialMl` fallbacks; deprecated `vialMl`/`labelId` aliases in `PrintSetupSelection` — *Low* (sections C/G).
  - Re-export shim modules in `features/label/`; `IndexedDbDesignLibrary` copy-policy asymmetry; inline-style literals against colocated CSS; two non-null assertions in `print/vialCapacity.ts` — *Low* (section C).
- **To `docs/FRD.md`:** none. Nothing found is roadmap-shaped; every item is a gap between shipped behavior and the standard, which `future-work-tracking.mdc` routes to TECH-DEBT.
- **To a new plan:** two items are large enough to need sequencing rather than a TECH-DEBT line.
  1. **Converge on one error convention (section D).** Six conventions are in play. Sequence: adopt `Result` across `src/shared/ports.ts` and its adapters and fakes → replace the three hand-rolled unions → then the `null`/`0`/`''` sentinels in the math layer, which is the behavior-sensitive part and needs the golden tests as a net. `parseNumericField` and the `domain/units.ts` decision both fall out of the last step.
  2. **Make the layer rules match the layer table (section F).** Either relocate the domain and composition modules into directories the existing globs match, or enumerate them; then add the missing `src/print` / `src/app` / `src/platform` blocks. This is a mechanical move with wide import churn, so it wants its own change set — and it is a prerequisite for trusting any future review's layering verdict.
- **To `known-findings.md`:** append nine new patterns, dated 2026-08-03, plus dated recurrence/analogue notes under the five existing entries they matched.
  - *A registry that centralizes dispatch while the branching migrates outward* — a Strategy/Registry lands and the central dispatcher is genuinely clean, so the extension point reads as closed; meanwhile the same `kind ===` comparison reappears in display helpers, guards, and view models, and one implementation names a sibling by id. Check the variant-addition cost, not the dispatcher.
  - *A fix that resolves the instances it enumerated and stops at the enumeration* — an entry is closed against a list of N occurrences rather than against the pattern, so adjacent occurrences in the same subsystem survive and the fix's own new mechanism (here, CSS fallback literals) adds fresh unpinned duplicates. Before marking a known finding resolved, re-run its detection, not its checklist.
  - *An abstraction built to fix a smell, then never adopted* — value objects, a `Result` type, or a builder introduced as the prescribed remedy for a named smell, with the smell left in place and the abstraction reachable only from its own tests. Costs twice: the original problem plus dead weight that reads as load-bearing.
  - *A single interface signalling failure three ways* — the same class of failure returning `Result`, `null`, and a rejection across sibling methods of one interface, so implementers copy the inconsistency downward.
  - *An enforcement rule scoped to a directory the standard's own layer table does not use* — lint globs matching `**/domain/**` while the modules the table calls "domain" live elsewhere. The rule passes, the boundary is unenforced, and a review that trusts the lint reports it clean.
  - *A coverage exclusion contradicted by a sibling test file* — a module excluded as "untested wiring" that has a dedicated test file, so real tests earn no ratchet credit and real regressions move no number.
  - *One variant of a discriminated union missing the field every sibling carries* — the handler substitutes a module default, and the type stops being able to express what the operation is evaluated against.
  - *Two migration tables for one legacy field* — a normalization function and a resolver each mapping the same legacy value, with different coverage; whichever entry point the caller happens to use decides the answer.
  - *Alias-instead-of-rename* — as proposed for the section G table above.
  - Dated notes to add under existing entries: **"A getter handing out elements of a shared catalog"** (recurrence — the freeze this entry asked to be confirmed did not land on `PRINT_CATALOG`); **"A parse function returning a sentinel"** (recurrence — confirmed instance is `parseNumericField` plus the `parseFloat(x || '0')` sites in `labelMathCore.ts`); **"A numeric literal carrying two unrelated meanings"** (recurrence — `DEFAULT_DRAW_UNITS_PER_MG`, three meanings); **"A default value declared twice with different values"** (analogue — generalize the entry from default values to any lookup or mapping table); **"A constant mirrored between TypeScript and CSS"** (analogue — inline `.tsx` style literals beside colocated `.css`); **"Identifiers drifting from the product's own vocabulary"** (analogue — `vialMl` in the print layer).

  The list did not go stale this round: pass 1 produced 17 findings the list had never seen, and the two highest-severity items in the whole review came from following up on instructions the list itself left for the next reviewer. That is the loop working as designed — but it also means the previous review's follow-ups were recorded and then not executed, which is worth watching.
