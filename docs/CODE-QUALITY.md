# Code quality standard

**What this document is:** the durable definition of "good" for this codebase — structure, types, clarity, failure handling, tests, and boundaries. Not a list of findings. Findings (point-in-time problems) belong in [TECH-DEBT.md](./TECH-DEBT.md), or in [HUMAN-TASKS.md](./HUMAN-TASKS.md) when only a person can verify the fix; roadmap intent belongs in [FRD.md](./FRD.md); vocabulary belongs in [COPY-GUIDELINES.md](./COPY-GUIDELINES.md). This document links to those rather than repeating them.

**How to read it:** every standard is stated as a general principle first, in full, so it applies to a module written next year that resembles nothing here. An example follows, always framed as "for instance, in this codebase..." — the example illustrates the principle, it does not define its boundary.

**Why it matters here specifically:** this app is client-side only (no backend to catch mistakes server-side), does safety-critical reconstitution math (a wrong number can mean a wrong measured amount), and makes a hard promise that the on-screen preview matches the thermal-printed output exactly. Structure that would be nice-to-have elsewhere is load-bearing here.

**When to use this doc:**

- **By default**, on any non-trivial structural change — new module, new abstraction, changing a boundary, adding a dependency direction. See `.cursor/rules/code-quality.mdc` for the always-applied index.
- **On demand**, for a full review of the whole codebase against every standard here. See the `code-quality-review` skill (`.cursor/skills/code-quality-review/SKILL.md`).

---

## A. Structure and design

### Separation of responsibilities

State: each layer has one job and a fixed dependency direction. For this codebase:

| Layer | Job | May depend on |
|---|---|---|
| Domain (`peptideMath.ts`, `LabelMathResolver.ts`, value objects) | Math and business rules | Nothing else in the app |
| Composition (`LabelComposer.ts`, `LabelLayoutEngine.ts`) | Turn domain output into a render plan | Domain |
| App / use cases (`src/app`) | Orchestrate I/O through ports | Domain, composition, ports, print — **never a concrete adapter** |
| Composition root (`src/app/exportLabelPng.ts`) | Construct adapters and inject them into a use case | Adapters in `src/platform` plus the use case it wires |
| Shared React state wrapper (`src/app/use*.ts`) | Hold busy/error state around a use case, shared by more than one feature | The use case and React — no adapters |
| Infrastructure / adapters (`src/platform`) | Implement ports against real browser APIs | Ports and pure print utilities — it is called, it does not call up into UI or a feature |
| Shared print (`src/print`) | Dimensions, catalog, export spec, print storage helpers | Ports, platform key/value adapter — never a feature |
| UI (`.tsx` components) | Render a view model and dispatch events | App, view models — never domain math or browser APIs directly |

The direction is one-way: UI depends on app depends on domain; nothing domain-level imports React, the DOM, or a browser API. Two rows exist specifically because dependency inversion needs somewhere to put the concretions: a use case depends only on the port interfaces in `src/shared/ports.ts`, and exactly one composition root builds the real adapters and hands them over.

`eslint.config.js` is the executable copy of this table — every row above has a matching `no-restricted-imports` block. Change both together. See `domain-label-architecture.mdc` for the label-feature view of the same boundaries.

### SOLID, for this codebase specifically

The acronym alone changes no behavior — each letter below is stated as a concrete test you can run against a module.

- **Single responsibility.** Test: can you name the module's job without the word "and"? For instance, `LabelMathResolver.ts` computes math and only math; it does not also decide what the label displays.
- **Open/closed.** Adding a calculator mode or a label template should be a new file plus a registry entry, never edits scattered across several existing modules. This is the reason Phase 2 introduces a `SolveStrategy` registry and Phase 3 introduces `LabelTemplate` — today, adding either requires touching multiple files with a conditional branch each.
- **Liskov substitution.** Every implementation of a shared interface (every `SolveStrategy`, every `LabelTemplate`) must be fully substitutable for any other. No implementation may throw "not supported" for a method its own interface promises, and none may silently no-op where a sibling implementation does real work. If one variant genuinely cannot honor a method, the interface is wrong and should be split.
- **Interface segregation.** Depend on the narrowest thing that does the job, not the whole model because it happened to be in scope. For instance, `computeQrRenderSizePx` in `qrRenderSize.ts` takes a narrow, fully-typed `QrRenderSizeInput` (`qrCodeCount`, `testIndicatorCount`, etc.) rather than a whole model — before Phase 1's fix, it took a `QrRenderLayoutModel` typed with `readonly unknown[]` fields just to read two array lengths, a wide, unsafe parameter the caller shape had forced on it.
- **Dependency inversion.** Depend on abstractions only at I/O boundaries, never in domain code. Same principle as "one error convention" below applied to *dependencies* rather than *failures*: ports at the edge, concretions behind them.

### Small units, with budgets

Budgets are a smell detector, not a law — a 40-line function that reads as one idea is fine, and the budget's job is to make you stop and look, not to force a mechanical split.

- Functions: soft budget ~30 lines.
- Classes and modules: soft budget ~200 lines.
- Components: soft budget ~120 lines. **Accepted markup-volume exceptions (2026-08-03):** `CalculatorView.tsx`, `FormInputs.tsx`, `SidebarSections.tsx`, and `LabelPreview.tsx` remain over budget because their excess is JSX field/panel markup, not inline decision logic — logic lives in view-model hooks; splitting further would fragment cohesive forms without reducing complexity.
- Parameters: four before switching to a context/options object.
- Nesting depth: three levels before extracting a named helper.

For instance, individual element validators under `elementValidators/` stay near the soft budget; `validateDesignDocument` itself is still a longer orchestration function (Phase 6) and remains a candidate to split further if it grows again. The old `LabelComposer.calculateLayouts` / `fitTitleAndBodyLayouts` bodies were split across `IdentityHeaderTemplate` + `TitleBodyFitter` in Phase 3 so each step stays near the ~30-line soft budget.

### Design pattern policy

State plainly which Gang of Four patterns are in deliberate use, and which are deliberately not, so nobody re-litigates the choice mid-review:

- **Strategy** — calculator solve modes (`SolveStrategy`, Phase 2) and label templates (`LabelTemplate`, Phase 3). Each variant is genuinely interchangeable behind one interface.
- **Builder** — test data construction (`LabelInputBuilder`) and label render-model assembly (`LabelRenderModelBuilder`, Phase 3). Multi-step construction with sensible defaults.
- **Facade** — use cases (`ExportLabelUseCase`, Phase 4) hide multi-step orchestration (compose, render, encode, download) behind one call.
- **Adapter** — `src/platform` wraps browser APIs (storage, canvas, file download, scroll) behind the app's own port interfaces.
- **Specification / Registry** — the element validator (Phase 6) and the solve-strategy lookup are registries of small, independently testable rules rather than one large conditional.
- **Not adding:** Observer (React's own state model already covers this), Singleton (nothing in this app needs enforced single-instantiation; module-level constants already behave the way a singleton would without the ceremony), Visitor, Command (no undo/redo or operation queue exists to justify one).

Governing rule: a pattern with one implementation and no forecast second one makes code harder to read, not easier. Reach for a pattern when it removes a real conditional or duplication, not because the vocabulary is available.

---

## B. Types and state

### Make illegal states unrepresentable

State: if the type allows a combination the domain forbids, the type is wrong, not just the code that constructs it. A boolean flag paired with a value it does not apply to, or two optional fields that are secretly mutually exclusive, are both symptoms.

For instance, calculator recommendations no longer pair a value with a separate origin flag. Authored `protocolUnits` / `targetConcentration` and derived `recommendedProtocolUnits` / `recommendedTargetConcentration` have distinct slots, so an origin cannot outlive the value it described.

### Separate authored from derived data

State: a value the user typed and a value the app calculated are different kinds of fact and should not share one field or container, even when they currently hold the same string. Mixing them is what forces provenance flags (`...Origin`) to exist at all — the flag is compensating for the container not being able to say which kind of fact it holds.

For instance, `LabelMathResolver.ts` returns authored state and a computed `ResolvedLabelMath` separately, while strategy recommendations that must survive between edits use dedicated `recommended*` slots. Readers choose between the authored and recommended slots using the solve strategy's ownership flags.

### Immutability by default

State: values that represent a fact about the past (an input already submitted, a catalog entry, an exported spec) should not be mutable after creation. Mutability should be the exception, requested explicitly, not the default nobody thought about.

For instance, `PRINT_CATALOG` (`src/print/printCatalog.ts`) is deep-frozen with a small `deepFreeze` helper — every stock, printer, and their nested arrays — so a cast-mutation anywhere downstream throws instead of silently corrupting the one catalog every consumer shares. Exported preset/config objects (`calculatorPresets.ts`, `calculatorModeSwitch.ts`, `domain/solveStrategy.ts`) use `Object.freeze` the same way, each with an `Object.isFrozen` regression test. Domain types use `readonly` fields throughout so a caller cannot mutate a shared object through the type system either.

---

## C. Clarity

### Clean code, stated so it is reviewable

- **Names state intent without needing a comment.** If a name needs a comment to explain what it *actually* means, the name is wrong.
- **No dead code or commented-out blocks.** Version control already remembers deleted code; a commented-out block is a maintenance cost with no reader benefit.
- **Comments explain a constraint the code cannot show, never what the line does or when it changed.** A comment describing an edit is a comment that stops being true the next time someone edits the line, because nothing forces it to be updated. For instance, `/* DECREASED PADDING: Tighter vertical box padding to save real estate */` in `LabelPreview.css` records an edit's history rather than a constraint the CSS is honoring — it should instead say *why* the padding must stay tight (e.g. which stock's usable width depends on it), or be deleted.

### One source of truth for every fact

State: a numeric constant, a formatting rule, or a default value should exist in exactly one place. If two modules need it, one imports from the other's canonical definition; neither hard-codes a copy.

For instance, per `docs/TECH-DEBT.md`, font ratios, line height, border width, and section spacing used by `LabelLayoutEngine.ts` for fit prediction are mirrored by hand in `LabelPreview.tsx` and `LabelPreview.css` — a visual-only CSS edit can silently make the fit prediction disagree with what actually renders. Phase 3 defines these once and exposes the TypeScript values to CSS via custom properties, so there is one number, read in two places, rather than two numbers kept in sync by hand.

### Ubiquitous language

State: the identifier used in code should be the same word the product and the user see. A second name for the same concept is a translation tax paid on every read.

Canonical vocabulary lives in [COPY-GUIDELINES.md](./COPY-GUIDELINES.md) — do not restate it here. Phase 2 action 2.7 renamed math identifiers onto that vocabulary (`compoundAmount`, `protocolAmount`, `protocolUnits`, `syringeCapacityMl`, and so on); keep new names aligned with the same source.

---

## D. Failure

### One error convention

State: pick one way to signal "this operation can fail as part of normal operation" and use it everywhere; reserve `throw` for programmer error (a contract violation that should never happen if the code calling it is correct).

The convention is `Result<T, E>` from `src/shared/result.ts` (see [ADR 0005](./ADR/0005-one-error-convention.md)): use it for expected recoverable failures (parsing user input, validating an imported design, resolving a print target from stale persisted state, storage writes that can be rejected). Use the `ok` / `err` constructors — a `no-restricted-syntax` lint rule rejects `{ ok: true }` / `{ ok: false }` object literals anywhere outside `src/shared/result.ts`. The success payload field is always `value`; `E` may be a string or a structured discriminant. `throw` is reserved for genuine programmer errors — a precondition the caller was supposed to guarantee and did not.

**Absence is not failure.** Returning `null` (or, for a few `Array.find`-shaped lookups, `undefined`) means "no answer is determined by these inputs, and that is normal" — for example calculator math when the user has not typed enough yet. Do not wrap absence in `Result`. A parser handed a string it cannot use is failure, not absence — that belongs in `Result`, not a sentinel like `0` that collides with a legitimate value.

### Recoverable failure UX

State: every operation that touches the outside world (storage, file I/O, clipboard, network if it is ever added) has three states — loading, success, failure — and failure has one deliberate resolution: degrade silently but name what happened in a way that is discoverable, or surface the failure to the user with a retry path. "Fails silently with no trace" is not one of the two acceptable outcomes.

For instance, storage adapters behind the ports introduced in Phase 4 should have an explicit decision recorded for what happens when `localStorage` throws (private browsing, quota exceeded) — not just an empty `catch {}`.

---

## E. Testing

Full testing strategy — including the Humble Object pattern that makes components testable without a DOM testing library — lives in `.cursor/rules/testing-vitest.mdc`. This section states the standards that intersect code quality; read that rule for the mechanics.

- **Behavior over implementation.** A test should stay green through a refactor that does not change observable behavior. An assertion that reads a private/internal field (for instance, the pre-Phase-0 assertions on `result.mergedInput.*` in `LabelMathResolver.test.ts`) breaks this — it fails when the internal shape changes even though nothing the user can observe changed.
- **Characterization tests before any refactor.** Before changing behavior-sensitive code, pin its current output with a characterization ("golden") test, so an unintended change is caught even before you've worked out what the *intended* new behavior should assert. See `LabelComposer.golden.test.ts` for the worked example — every catalog stock, several representative inputs, snapshotted.
- **Test data builders over inline fixtures.** A hand-written literal of the main input model, repeated across dozens of tests, means a shape change requires editing every one of them. A fluent builder (see `src/features/label/testing/labelInputBuilder.ts`) with named presets for the recurring scenarios centralizes that cost to one place.
- **Coverage as a ratchet, never a target.** The threshold in `vite.config.ts` exists to catch a regression, not to be chased for its own sake — writing a test whose only purpose is to hit a percentage produces exactly the low-value, implementation-coupled tests this document argues against elsewhere. Raise the threshold when real coverage improves; never lower it without a written reason in the same commit.

---

## F. Boundaries and enforcement

### Enforced module boundaries

State: the dependency rules in section A are only real if something other than habit enforces them. Phase 7 adds ESLint `no-restricted-imports` rules so a domain module cannot import React or a platform adapter, a `.tsx` view cannot import `src/platform`, and `label` / `customDesign` cannot import each other (shared code lives in `app/`, `print/`, or `shared/`).

### Accessibility as a standing requirement

State: accessibility is a property of the UI layer that is checked continuously, not a pass done once. Keyboard reachability, labelled form controls, and sufficient contrast apply to every new UI surface as it is built, and existing gaps get fixed as part of Phase 5 rather than deferred indefinitely. `eslint-plugin-jsx-a11y`'s recommended rules run over `src/**/*.tsx`, so the mechanical part of this (label association, alt text, roles) fails lint rather than waiting for a review to notice. Contrast and keyboard flow still need a human pass — the plugin cannot see them.

### ADRs for decisions worth a paragraph in six months

State: when a decision has a real alternative that a future reader will wonder about ("why not just X?"), write a short Architecture Decision Record explaining the choice and the trade-off, not just the choice. Phase 7 seeds `docs/ADR/` with the decisions this refactor itself makes — the layering direction, the `Result` convention, the ports/adapters boundary — precisely because those are the ones most likely to be second-guessed later without the reasoning attached.

---

## G. Code smell catalogue

Named smells this codebase is actually prone to, each with its fix. Treat the catalogue as open — add a smell here when a review finds one that is not yet listed.

| Smell | What it looks like | Fix |
|---|---|---|
| Long function | A function doing several distinct steps in one body, well over the ~30-line budget | Extract each step into a named helper; the names alone should read like a table of contents |
| Long parameter list | More than four parameters, especially several of the same primitive type in a row | Group related parameters into a context/options object |
| Primitive obsession | A `string` or `number` standing in for a concept with its own rules (a unit, an amount, a percentage) | A small value object that owns its own validation and formatting |
| God object / god file | One module accumulating unrelated responsibilities because it was the easiest place to add "just one more thing" | Split along the responsibilities in section A's layer table |
| Duplicated logic | The same calculation or rule expressed independently in two places | Extract to one function; both call sites depend on it |
| Magic number | A numeric literal with meaning that only exists in a comment, or no comment at all | A named constant, colocated with related constants, with the "why this value" stated once |
| Mixed concerns | Domain logic living inside a view component, or a browser API called directly from domain/app code | Move the logic to its layer per section A; go through a port for browser APIs |
| Shotgun surgery | One conceptual change (e.g. adding a calculator mode) requires edits across four or more files | The registry/strategy pattern in section A — a new variant should be one new file plus one registration |
| Speculative generality | Abstraction, a parameter, or a builder method built for a use case that does not exist yet | Delete it until a second real caller justifies it; a test written only to exercise unused generality is the same smell in test form |
| Stale comment | A comment describing behavior, a value, or an edit that is no longer true | Delete or rewrite when touching the line it describes; comments are not exempt from the same review as code |
| Alias-instead-of-rename | A deprecated identifier kept beside its canonical replacement as an optional field, so both stay readable and every consumer adds a `?? legacy` fallback | Confine the legacy name to the migration function that reads persisted data; no other caller may fall back to it |
| Tri-purpose constant | One named constant used as a rate, a display placeholder, and a floor, because all three happen to want the same number today | One constant per meaning, even at the same value — they diverge independently |

---

## Maintaining this document

- **Do not duplicate a canonical home.** Vocabulary rules stay in `COPY-GUIDELINES.md`; testing mechanics stay in `testing-vitest.mdc`; print/thermal constraints stay in `thermal-print-output.mdc`. Link to them from here.
- **Update in the same change set as the standard changes**, per `.cursor/rules/code-quality.mdc`. A rule and this doc are not allowed to drift apart.
- **Keep examples current.** Once a phase fixes an example cited here, update the citation to point at the fixed form (or note it as "fixed in Phase N") rather than leaving a stale "here is the bug" example that no longer exists in the code.
