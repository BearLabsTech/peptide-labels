# Known findings

Accumulating record of what past reviews actually found. **Read only during pass 2** — reading this before pass 1 causes tunnel vision (see `SKILL.md`).

Each entry is written as a **pattern** — what it looks like anywhere, generalized — rather than a one-off line reference, so a future review can recognize an analogue in a place this list has never seen. The original instance is cited as evidence, not as the definition of the pattern.

When you find a recurrence or an analogue during a review, append a dated note under the matching entry. When you find something genuinely new, add a new entry in the same format.

---

### A numeric literal carrying two unrelated meanings

**Pattern:** one constant used for two purposes that happen to need the same number today but have no principled reason to stay equal — a future change to one meaning silently breaks the other.

**Evidence (2026):** flagged during the initial architecture audit; specific instance superseded once the underlying constants were split out during Phase 1 magic-number naming. See `docs/CODE-QUALITY.md` section C for the "one source of truth" standard this violates.

### A constant mirrored between TypeScript and CSS

**Pattern:** a numeric layout value (ratio, spacing, border width) expressed once in a `.ts` file for fit-prediction purposes and again, independently, in a `.css`/`.tsx` file for rendering — nothing keeps the two in sync.

**Evidence (2026):** `LabelLayoutEngine.ts` font ratios, line height, border width, and section spacing duplicated in `LabelPreview.tsx` / `LabelPreview.css`. Tracked in `docs/TECH-DEBT.md` ("Preview fitting metrics — duplicated between TypeScript and CSS"); **Resolved 2026-08-02/03 (Phase 3 action 3.5):** single `LABEL_TYPOGRAPHY` object + CSS custom properties on the label container; preview CSS consumes `var(--label-…)` instead of mirrored literals.

### A default value declared twice with different values

**Pattern:** the "default" for the same field or setting is hard-coded in two places (e.g. a form's initial state and a fallback deep in a resolver), and the two literals have drifted apart without anyone noticing because nothing compares them.

**Evidence (2026):** flagged during the initial architecture audit as a category to watch for across calculator defaults; no confirmed live instance recorded yet as of this writing — recorded here as a pattern to check on every review, not as a resolved finding.

### A validated object returned by reference

**Pattern:** a validation or normalization function returns the same object it was handed (or a shared cached object) rather than a fresh value, so a caller mutating its result can silently corrupt what the next caller receives.

**Evidence (2026):** flagged as a category during the initial audit in the custom-design import/validation path. Confirm against current code on next review rather than assuming still present.

### A getter handing out elements of a shared catalog

**Pattern:** a lookup function returns a live reference into a shared, module-level catalog array/object instead of a copy — a caller that mutates the returned value corrupts the catalog for every future caller.

**Evidence (2026):** flagged as a risk category for `printCatalog.ts` lookups (stocks, printers) during the initial audit. Phase 1's `Object.freeze` on exported catalogs converts a possible silent-corruption bug into a loud runtime error instead, which is the intended mitigation — confirm on next review that the freeze actually landed and covers every exported catalog, not just the ones touched first.

### Provenance flags compensating for authored and derived data sharing a container

**Pattern:** a `somethingOrigin` / `isDerived` / `wasAutoFilled`-style flag exists specifically so downstream code can tell whether a field holds a user-entered value or a calculated one — the flag is a symptom that the container should have been two types, not one.

**Evidence (2026):** `LabelModelInput` / `mergedInput` in `LabelMathResolver.ts` (`targetConcentrationOrigin`, `protocolUnitsOrigin`, etc.). Root-caused in `docs/CODE-QUALITY.md` section B ("separate authored from derived data"); Phase 2 removes the shared container.

### A parse function returning a sentinel for unparseable input

**Pattern:** a numeric parser returns `0` (or another in-range value) when it cannot parse its input, instead of a distinguishable "could not parse" result — a genuine zero and a parse failure become indistinguishable to every caller.

**Evidence (2026):** flagged as a category to check across `peptideMath.ts` input parsing during the initial audit. Phase 1's `Result<T, E>` type (action 1.6) is the intended fix wherever this is confirmed present — confirm which specific parse functions still do this on next review.

### Identifiers drifting from the product's own vocabulary

**Pattern:** an internal identifier uses an older or informal term for a concept the product (and `COPY-GUIDELINES.md`) now names differently — readers have to mentally translate between the code's vocabulary and the product's.

**Evidence (2026):** Math identifiers formerly used the older compound-quantity names (and related presets/helpers) while the public model already said `compoundAmount`. **Resolved 2026-08-02 (Phase 2 action 2.7):** renamed onto COPY-GUIDELINES vocabulary (`compoundAmount`, `hasPositiveCompoundAmount`, `COMPOUND_AMOUNT_PRESETS_*`, `protocolAmount`, `protocolUnits` field kind, `syringeCapacityMl`).

### Tests asserting a merged internal model instead of observable output

**Pattern:** a test reads a private/internal field of a merged result object (e.g. `result.mergedInput.someField`) instead of the value a user or another module would actually observe — the test breaks on internal refactors even when nothing user-visible changed, and stops being a safety net for the refactor that removes that internal shape.

**Evidence (2026):** `LabelMathResolver.test.ts` asserted directly on `result.mergedInput.protocolUnits` and similar fields prior to Phase 0 action 0.5. Fixed by routing those assertions through the same `displayWaterAmount` / `displayDrawUnits` / `displayConcentration` functions the calculator UI itself calls — the test now observes what the user sees. Two further instances found in `calculatorModeSwitch.test.ts` (one a pure duplicate of an adjacent display-level assertion, deleted; one with no adjacent check, rewritten) and three in `peptideMath.edge.test.ts`, fixed the same way to close out action 0.5. Note the boundary this pattern does **not** apply past: a test asserting the direct return value of the function it is actually testing (e.g. `calculatorModeSwitch.ts`'s own exported functions returning `{ protocolUnitsOrigin: 'recommended' }`) is normal state-based unit testing, not a violation — the smell is reaching into a *different* module's internal field, not asserting on the unit under test's own contract.

### Duplicate scenario numbers across test files that are not actually duplicate tests

**Pattern:** the same input numbers (e.g. a specific vial/protocol/concentration combination) appear in tests at multiple layers — a pure math function, a resolver that dispatches to it, a composer that renders through it. This looks like triplication but often is not: each layer's test answers "what breaks if I delete this test and nothing else does," and if the answer differs per layer (pure formula correctness vs. mode-dispatch routing vs. render/integration behavior), all three earn their place. The real smell is the *same layer* tested twice with the same numbers, not the same numbers appearing at different layers.

**Evidence (2026-08):** found during Phase 0 action 0.6's triplication sweep. The 22 mg / target-concentration-15 scenario and the 23.3 mg round-trip scenario each appear in `peptideMath.unit.test.ts` (or `.edge.test.ts`), `LabelMathResolver.test.ts`, and (for the first) `LabelComposer.test.ts` — all three were kept, since each tests a different unit. The junk-input scenario, by contrast, appeared twice at the *same* layer (`resolveLabelMath` called directly in both `LabelMathResolver.test.ts` and `peptideMath.edge.test.ts` with junk strings, same all-empty assertion) — that one was a true duplicate and the resolver-level copy was deleted. When reviewing apparent duplication, check which function is actually being called before assuming triplication.

### A clamp that silently makes most of a constant's range dead

**Pattern:** a value is computed as `someConstant + delta` and then clamped to a maximum that is reachable well before the constant's nominal "full range" would suggest — edits to the constant above a certain point have zero effect, and nothing about the constant's definition signals this.

**Evidence (2026-08):** found during Phase 0 golden-test sensitivity verification. `TITLE_HEIGHT_WEIGHT` in `labelLayoutConstants.ts` was `0.5`; `LabelComposer` computed the non-danger weight as `Math.min(TITLE_HEIGHT_WEIGHT + 0.06, 0.55)`. Any `TITLE_HEIGHT_WEIGHT` value of `0.49` or higher produced the same effective `0.55`. **Resolved 2026-08-02 (Phase 1 action 1.1):** replaced with a single named constant `TITLE_HEIGHT_WEIGHT_WITH_BODY = 0.55`.
