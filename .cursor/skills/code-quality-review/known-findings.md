# Known findings

Accumulating record of what past reviews actually found. **Read only during pass 2** — reading this before pass 1 causes tunnel vision (see `SKILL.md`).

Each entry is written as a **pattern** — what it looks like anywhere, generalized — rather than a one-off line reference, so a future review can recognize an analogue in a place this list has never seen. The original instance is cited as evidence, not as the definition of the pattern.

When you find a recurrence or an analogue during a review, append a dated note under the matching entry. When you find something genuinely new, add a new entry in the same format.

---

### A numeric literal carrying two unrelated meanings

**Pattern:** one constant used for two purposes that happen to need the same number today but have no principled reason to stay equal — a future change to one meaning silently breaks the other.

**Evidence (2026):** flagged during the initial architecture audit; specific instance superseded once the underlying constants were split out during Phase 1 magic-number naming. See `docs/CODE-QUALITY.md` section C for the "one source of truth" standard this violates.

**Recurrence (2026-08-03 Phase 8):** `DEFAULT_DRAW_UNITS_PER_MG` serves as rate, placeholder, and floor/scaling basis — three meanings, not two. Was Open in `docs/TECH-DEBT.md` after sweeps.

**Resolved (2026-08-04, clean-slate action 2):** the three meanings became three named constants at the same value (10) — rate/scaling keeps `DEFAULT_DRAW_UNITS_PER_MG` / `_PER_IU`; display placeholder is `PLACEHOLDER_DRAW_UNITS`; IU floor is `DRAW_UNITS_IU_FLOOR`.

### A constant mirrored between TypeScript and CSS

**Pattern:** a numeric layout value (ratio, spacing, border width) expressed once in a `.ts` file for fit-prediction purposes and again, independently, in a `.css`/`.tsx` file for rendering — nothing keeps the two in sync.

**Evidence (2026):** `LabelLayoutEngine.ts` font ratios, line height, border width, and section spacing duplicated in `LabelPreview.tsx` / `LabelPreview.css`. Tracked in `docs/TECH-DEBT.md` ("Preview fitting metrics — duplicated between TypeScript and CSS"); **Resolved 2026-08-02/03 (Phase 3 action 3.5):** single `LABEL_TYPOGRAPHY` object + CSS custom properties on the label container; preview CSS consumes `var(--label-…)` instead of mirrored literals.

**Analogue (2026-08-03 Phase 8):** inline `.tsx` `style={{…}}` literals beside colocated `.css` for the same visual role — same sync hazard without a custom-property bridge.

### A default value declared twice with different values

**Pattern:** the "default" for the same field or setting is hard-coded in two places (e.g. a form's initial state and a fallback deep in a resolver), and the two literals have drifted apart without anyone noticing because nothing compares them.

**Evidence (2026):** flagged during the initial architecture audit as a category to watch for across calculator defaults; no confirmed live instance recorded yet as of this writing — recorded here as a pattern to check on every review, not as a resolved finding.

**Analogue (2026-08-03 Phase 8):** generalize beyond defaults to any lookup or mapping table — two `labelId → stockId` migration tables disagreed on `40x30`. **Resolved** in quality follow-up (unified migrations). See also *Two migration tables for one legacy field* below.

### A validated object returned by reference

**Pattern:** a validation or normalization function returns the same object it was handed (or a shared cached object) rather than a fresh value, so a caller mutating its result can silently corrupt what the next caller receives.

**Evidence (2026):** flagged as a category during the initial audit in the custom-design import/validation path. **Resolved 2026-08-03 (Phase 6 action 6.2):** `validateDesignDocument` builds a fresh typed `DesignDocument` from validator `value`s and never returns the caller input; regression asserts distinct object/array identity.

### A getter handing out elements of a shared catalog

**Pattern:** a lookup function returns a live reference into a shared, module-level catalog array/object instead of a copy — a caller that mutates the returned value corrupts the catalog for every future caller.

**Evidence (2026):** flagged as a risk category for `printCatalog.ts` lookups (stocks, printers) during the initial audit. Phase 1's `Object.freeze` on exported catalogs converts a possible silent-corruption bug into a loud runtime error instead, which is the intended mitigation — confirm on next review that the freeze actually landed and covers every exported catalog, not just the ones touched first.

**Recurrence (2026-08-03 Phase 8):** the freeze this entry asked to confirm had not landed on `PRINT_CATALOG` / `filterCatalog` live references. **Resolved** in quality follow-up — `deepFreeze` on `PRINT_CATALOG`.

### Provenance flags compensating for authored and derived data sharing a container

**Pattern:** a `somethingOrigin` / `isDerived` / `wasAutoFilled`-style flag exists specifically so downstream code can tell whether a field holds a user-entered value or a calculated one — the flag is a symptom that the container should have been two types, not one.

**Evidence (2026):** `LabelModelInput` / `mergedInput` in `LabelMathResolver.ts` formerly used origin flags to distinguish system recommendations from authored values. Root-caused in `docs/CODE-QUALITY.md` section B ("separate authored from derived data"); Phase 2 removed `mergedInput` write-back. **Resolved 2026-08-03:** authored `protocolUnits` / `targetConcentration` and derived `recommendedProtocolUnits` / `recommendedTargetConcentration` now have separate slots, and the origin flags are deleted.

### A parse function returning a sentinel for unparseable input

**Pattern:** a numeric parser returns `0` (or another in-range value) when it cannot parse its input, instead of a distinguishable "could not parse" result — a genuine zero and a parse failure become indistinguishable to every caller.

**Evidence (2026):** flagged as a category to check across `peptideMath.ts` input parsing during the initial audit. Phase 1's `Result<T, E>` type (action 1.6) is the intended fix wherever this is confirmed present — confirm which specific parse functions still do this on next review.

**Recurrence (2026-08-03 Phase 8):** confirmed — `parseNumericField` plus `parseFloat(x || '0')` sites in `labelMathCore.ts`. **Deferred** to the error-convention plan (inventory in sweeps plan Deferred section / `docs/TECH-DEBT.md`).

**Resolved (2026-08-04, error-convention action 6):** `parseNumericField` now returns `number | null` instead of `0`. The four `labelMathCore.ts` `parseFloat(x || '0')` sites were confirmed to be a *different* case, not this pattern — they feed `deriveMath` computations directly rather than a `> 0` guard, so `'0'` there is a deliberate finite-input requirement, not a sentinel standing in for failure; they were left as `'0'` on purpose, with a comment recorded at the site. The five sibling `peptideMath.ts` guard sites that *were* this pattern were unified onto `parseFloat(x || '')`, matching the eight guard sites that already used it. Fixing the sentinel surfaced a live instance of *the worked example this pattern always describes*: `isPresetSelected` compared a parsed value to a preset with `===`, so junk input that used to coerce to `0` could match a `'0'`-valued preset — `null === number` is always `false`, closing it as a side effect of the type change rather than a separate fix.

### Identifiers drifting from the product's own vocabulary

**Pattern:** an internal identifier uses an older or informal term for a concept the product (and `COPY-GUIDELINES.md`) now names differently — readers have to mentally translate between the code's vocabulary and the product's.

**Evidence (2026):** Math identifiers formerly used the older compound-quantity names (and related presets/helpers) while the public model already said `compoundAmount`. **Resolved 2026-08-02 (Phase 2 action 2.7):** renamed onto COPY-GUIDELINES vocabulary (`compoundAmount`, `hasPositiveCompoundAmount`, `COMPOUND_AMOUNT_PRESETS_*`, `protocolAmount`, `protocolUnits` field kind, `syringeCapacityMl`).

**Analogue (2026-08-03 Phase 8):** `vialMl` still appears beside `vialCapacityMl` in the print layer (`??` fallbacks). Residual sites Open in `docs/TECH-DEBT.md`.

### Tests asserting a merged internal model instead of observable output

**Pattern:** a test reads a private/internal field of a merged result object (e.g. `result.mergedInput.someField`) instead of the value a user or another module would actually observe — the test breaks on internal refactors even when nothing user-visible changed, and stops being a safety net for the refactor that removes that internal shape.

**Evidence (2026):** `LabelMathResolver.test.ts` asserted directly on `result.mergedInput.protocolUnits` and similar fields prior to Phase 0 action 0.5. Fixed by routing those assertions through the same `displayWaterAmount` / `displayDrawUnits` / `displayConcentration` functions the calculator UI itself calls — the test now observes what the user sees. Two further instances found in `calculatorModeSwitch.test.ts` (one a pure duplicate of an adjacent display-level assertion, deleted; one with no adjacent check, rewritten) and three in `peptideMath.edge.test.ts`, fixed the same way to close out action 0.5. Note the boundary this pattern does **not** apply past: a test asserting the direct return value of the function it is actually testing (e.g. `calculatorModeSwitch.ts`'s own exported functions returning `{ protocolUnitsOrigin: 'recommended' }`) is normal state-based unit testing, not a violation — the smell is reaching into a *different* module's internal field, not asserting on the unit under test's own contract.

### Duplicate scenario numbers across test files that are not actually duplicate tests

**Pattern:** the same input numbers (e.g. a specific vial/protocol/concentration combination) appear in tests at multiple layers — a pure math function, a resolver that dispatches to it, a composer that renders through it. This looks like triplication but often is not: each layer's test answers "what breaks if I delete this test and nothing else does," and if the answer differs per layer (pure formula correctness vs. mode-dispatch routing vs. render/integration behavior), all three earn their place. The real smell is the *same layer* tested twice with the same numbers, not the same numbers appearing at different layers.

**Evidence (2026-08):** found during Phase 0 action 0.6's triplication sweep. The 22 mg / target-concentration-15 scenario and the 23.3 mg round-trip scenario each appear in `peptideMath.unit.test.ts` (or `.edge.test.ts`), `LabelMathResolver.test.ts`, and (for the first) `LabelComposer.test.ts` — all three were kept, since each tests a different unit. The junk-input scenario, by contrast, appeared twice at the *same* layer (`resolveLabelMath` called directly in both `LabelMathResolver.test.ts` and `peptideMath.edge.test.ts` with junk strings, same all-empty assertion) — that one was a true duplicate and the resolver-level copy was deleted. When reviewing apparent duplication, check which function is actually being called before assuming triplication.

### A clamp that silently makes most of a constant's range dead

**Pattern:** a value is computed as `someConstant + delta` and then clamped to a maximum that is reachable well before the constant's nominal "full range" would suggest — edits to the constant above a certain point have zero effect, and nothing about the constant's definition signals this.

**Evidence (2026-08):** found during Phase 0 golden-test sensitivity verification. `TITLE_HEIGHT_WEIGHT` in `labelLayoutConstants.ts` was `0.5`; `LabelComposer` computed the non-danger weight as `Math.min(TITLE_HEIGHT_WEIGHT + 0.06, 0.55)`. Any `TITLE_HEIGHT_WEIGHT` value of `0.49` or higher produced the same effective `0.55`. **Resolved 2026-08-02 (Phase 1 action 1.1):** replaced with a single named constant `TITLE_HEIGHT_WEIGHT_WITH_BODY = 0.55`.

### A type/value-object layer introduced ahead of adoption, then never adopted

**Pattern:** a plan or action introduces a new type (often a branded value object with a smart constructor) intending it to be adopted at real call sites "later" — the type ships, gets its own unit tests, and then nothing outside those tests ever calls the constructor. The tests pass forever and the coverage tool counts the module as covered, so nothing signals that the abstraction did not take.

**Evidence (2026-08):** found during Phase 8.3 plan-claims verification (finding F5). `domain/units.ts` defined `Mass`, `VolumeMl`, `ConcentrationPerMl`, `DrawUnits`, `VialCapacityMl`, `SyringeCapacityMl` and six `make*` constructors (action 1.2) as a deliberately deferred first step; a whole-tree search found zero production importers of any of them — only `units.test.ts` called them. **Resolved 2026-08-03 (Phase 8.4):** deleted the six types, six constructors, and their four unused sibling conversion helpers (`mlToDrawUnits`, `drawUnitsToMl`, `mcgToMg`, `mgToMcg` — also zero production callers) rather than adopting them, since the calculator's real parse boundary (`CalculatorModeInput` in `calculatorGuards.ts`) already carries plain `number` and a second, unify-later pass was not scheduled. When a review finds this pattern again, check for real callers before assuming "adopt it" is the right fix — deleting speculative generality is equally valid per `docs/CODE-QUALITY.md` section G.

### A registry that centralizes dispatch while the branching migrates outward

**Pattern:** a Strategy/Registry lands and the central dispatcher is genuinely clean, so the extension point reads as closed; meanwhile the same `kind ===` comparison reappears in display helpers, guards, and view models, and one implementation names a sibling by id. Check the variant-addition cost, not the dispatcher.

**Evidence (2026-08-03 Phase 8):** `calculatorSolveMode` branching outside `SolveStrategy`, including a strategy reading a sibling's id; `calculateRequiredWaterMl` re-deriving water independently of `deriveMath`. **Resolved** in quality follow-up Phase A (`SOLVE_STRATEGIES` members own display precedence, visibility, and water math).

### A fix that resolves the instances it enumerated and stops at the enumeration

**Pattern:** an entry is closed against a list of N occurrences rather than against the pattern, so adjacent occurrences in the same subsystem survive and the fix's own new mechanism adds fresh unpinned duplicates. Before marking a known finding resolved, re-run its detection, not its checklist.

**Evidence (2026-08-03 Phase 8):** preview-fitting / CSS fallback work left adjacent unpinned literals and related sync hazards. Quality follow-up and Phase B closed the typography fallbacks that were in scope; treat "list complete" as insufficient proof on future closes.

### An abstraction built to fix a smell, then never adopted

**Pattern:** value objects, a `Result` type, or a builder introduced as the prescribed remedy for a named smell, with the smell left in place and the abstraction reachable only from its own tests. Costs twice: the original problem plus dead weight that reads as load-bearing.

**Evidence (2026-08-03 Phase 8):** same family as *A type/value-object layer introduced ahead of adoption* (`domain/units.ts`). **Resolved 2026-08-03 (Phase 8.4)** by deletion. `Result` adoption across parse/export/storage remains **deferred** to the error-convention plan.

### A single interface signalling failure three ways

**Pattern:** the same class of failure returning `Result`, `null`, and a rejection across sibling methods of one interface, so implementers copy the inconsistency downward.

**Evidence (2026-08-03 Phase 8):** inventory in sweeps plan Deferred section (hand-rolled `{ ok }` unions, promise rejections for ordinary I/O, storage `null` collapsing absent/corrupt/unavailable). **Deferred** to the error-convention plan.

**Resolved (2026-08-04, error-convention actions 2–5):** all three failure signals converged onto one convention (ADR 0005). Eleven hand-rolled `{ ok }` unions became `Result<T, E>`; eleven promise rejections for ordinary I/O moved behind adapter boundaries so callers see `Result` instead of a `try`/`catch`; the three storage reads that collapsed absent/corrupt/unavailable into one `null` now return a discriminated `LoadPrintSetupResult` / `LoadAgreementResult`. One interface still has an intentionally-empty failure side rather than three signals: `KeyValueStore.get`'s `{ kind: 'unavailable' }` and friends are a `Result`-shaped discriminated union, not a rejection or a bare `null`, so the "three ways" this pattern names no longer has a live instance in this codebase as of this action.

### An enforcement rule scoped to a directory the standard's own layer table does not use

**Pattern:** lint globs matching `**/domain/**` while the modules the table calls "domain" live elsewhere. The rule passes, the boundary is unenforced, and a review that trusts the lint reports it clean.

**Evidence (2026-08-03 Phase 8):** purity block matched `src/**/domain/**` while math/composition lived in `src/features/label` root; missing blocks for `app` / `print` / `platform`. **Resolved 2026-08-04 (sweep action 5)** by enumerating real paths (D3). Related residual: dead `**/*.tsx` specifier ban still Open in TECH-DEBT.

### A coverage exclusion contradicted by a sibling test file

**Pattern:** a module excluded as "untested wiring" that has a dedicated test file, so real tests earn no ratchet credit and real regressions move no number.

**Evidence (2026-08-03 Phase 8):** view-model modules excluded while their tests existed. Overlaps *Coverage tool treating a naming convention…* below. **Resolved 2026-08-04 (sweep action 6).**

### One variant of a discriminated union missing the field every sibling carries

**Pattern:** the handler substitutes a module default, and the type stops being able to express what the operation is evaluated against.

**Evidence (2026-08-03 Phase 8):** noted in the routing list for known-findings; confirm on the next full review whether a live instance remains after SolveStrategy / calculator provenance work.

### Two migration tables for one legacy field

**Pattern:** a normalization function and a resolver each mapping the same legacy value, with different coverage; whichever entry point the caller happens to use decides the answer.

**Evidence (2026-08-03 Phase 8):** two `labelId → stockId` tables; `40x30` wrong through `resolvePrintTarget`. **Resolved** in quality follow-up.

### Alias-instead-of-rename

**Pattern:** a deprecated identifier kept beside its canonical replacement as an optional field, so both are readable indefinitely and every consumer adds a `?? legacy` fallback. Looks like a safe migration; is actually a permanent second vocabulary plus a representable illegal state. Fix: split the legacy shape into a persistence-only type consumed solely by the migration function.

**Evidence (2026-08-03 Phase 8):** `vialMl` / `labelId` aliases in `PrintSetupSelection`; residual `?? vialMl` in two call sites — Open in `docs/TECH-DEBT.md`. Proposed for `docs/CODE-QUALITY.md` section G table when that doc is next edited for smells.

### Coverage tool treating a naming convention as a structural signal

**Pattern:** coverage exclude globs (or other tooling filters) key off a naming prefix that the codebase also uses for *pure* modules. Pure code is silently dropped from the measured set; thresholds look healthy while the real logic is unmeasured.

**Evidence (2026-08-04 sweeps):** files named `use*.ts` that were view-models or helpers (not React hooks) were excluded with `src/**/use*.ts`. **Resolved 2026-08-04 (sweep action 6):** renamed pure modules off the `use` prefix; exclusions limited to real Humble Object UI and thin adapters. Thresholds re-measured and raised.

### An accepted ADR that no module follows

**Pattern:** an ADR is recorded as "Accepted," reviewers cite it as settled, and the decision reads as done — but nothing enforces it, so real code drifts away from it immediately and the drift is invisible until someone diffs the ADR's own claim against the tree.

**Evidence (2026-08-04, error-convention plan):** ADR 0005 ("One error convention") was Accepted 2026-08-02. By the time the error-convention plan started two days later, eleven hand-rolled `{ ok }` unions used field names the ADR's own text technically allowed ("matching that shape") but that were not the literal `Result<T, E>` type; storage reads returned a bare `null` for three distinct failure kinds; `parseNumericField` returned a sentinel `0`. None of this tripped a lint rule or a type error — the ADR had no enforcement mechanism, only a citation in commit messages. **Resolved** for this specific ADR by the error-convention plan (actions 1–6) plus an amendment (2026-08-04) that closed the "matching that shape" loophole by naming the literal type and its field names. The general pattern is not resolved by fixing one instance: action 8 considered, and left open pending a decision, a lint rule banning `ok: true` object literals outside `src/shared/result.ts` — see `docs/TECH-DEBT.md`. Until an ADR's rule has a mechanical check, treat "Accepted" as a claim to verify against the code, not a fact about it.

### Refactor scaffolding that outlives the refactor

**Pattern:** a temporary folder, flag, or dual-path (`__legacy_*`, `new_*` alongside `old_*`) is left in the tree after the cutover. It still compiles and may still run in CI, so nothing forces removal.

**Evidence (2026-08-04 sweeps):** Phase 8 noted `__legacy_check__/` as leftover (untracked, five-minute local-gate test). **Resolved 2026-08-04 (sweep action 4):** path already absent on `main`; recorded as no-op. Prefer deleting scaffolding in the same change set that finishes the cutover.
