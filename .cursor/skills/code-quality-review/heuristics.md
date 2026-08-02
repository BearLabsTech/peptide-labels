# Review heuristics

For each standard in [docs/CODE-QUALITY.md](../../../docs/CODE-QUALITY.md): a reasoning prompt — an open question that forces analysis rather than pattern-matching — followed by the mechanical checks that operationalize it.

**These checks are a floor.** They are cheap, mechanical ways to start on each standard. Passing all of them says nothing about whether the standard is actually met — that judgment comes from reading the code against the principle itself. If a check does not apply to the codebase in front of you, say so and reason from the principle directly instead.

## B. Types and state

**Illegal states unrepresentable.** Which facts are stated in more than one place, and what states does this type permit that the domain actually forbids?

- Count `if (!x)`, `|| ''`, and early `return null` guards in state-handling modules. A high count means the type is too permissive and the guards are the map of what a stricter type would eliminate.

**Authored vs. derived.** Where does a value the user typed and a value the app calculated share one container?

- Look for a merged model carrying both. Provenance/origin flags (`somethingOrigin`, `isDerived`, `wasAutoFilled`) are the tell — they exist specifically to compensate for the container not being able to say which kind of fact it holds.

**Immutability.** What would make this module hard to change safely?

- Count `readonly` usage across `src/` — near zero is a finding. Look for exported arrays/objects without `as const`. Look for a getter or accessor that returns an element of a shared catalog by reference rather than a copy.

## A. Structure and design

**Single responsibility.** For each module over ~150 lines, try to name its job in one phrase. If the phrase needs "and", it is doing two things.

**Open/closed.** For each extension point that exists or is coming (calculator modes, label templates, element kinds, print stocks), count how many files adding a new variant would touch. More than two means the abstraction is missing or incomplete.

**Liskov.** Check every implementation of a shared interface for a method that throws "not supported," returns a sentinel meaning "not applicable," or is silently a no-op where siblings do real work.

**Interface segregation.** Where does a caller need to know something it should not? Look for functions taking a large object and reading two or three of its fields, and for parameters typed loosely (`unknown`, `any`, a whole model) because narrowing them felt like more coupling than it was worth.

**Unit size.** List every function over 30 lines, class/module over 200, component over 120, and signature over four parameters. Sort by size — the top of that list is usually the top of the refactor priority list too.

**I/O boundaries.** Search for `localStorage`, `indexedDB`, `document.`, `new Image`, `FileReader`, `canvas` outside adapter modules. Anything domain- or app-layer using these directly is a boundary violation.

## D. Failure

**Error convention.** Enumerate every distinct failure signal in use across the codebase and count them. More than two conventions in play is a finding on its own. Grep for `catch {` with no binding — a swallowed error with no trace.

**Failure UX.** For each async operation (storage read/write, file export, import), check that loading, success, and failure are all handled somewhere a user could observe. List the ones missing any state.

## E. Testing

**Behavior over implementation.** Look for assertions naming an internal field (a merged/internal model's property) rather than observable output the user or another module actually consumes.

**Test data builders.** Look for inline fixture literals of the main input model repeated across several test files — a shape change would require editing all of them by hand.

**Duplication across layers.** Look for the same scenario (same numbers, same inputs) asserted independently at three different layers (unit, resolver/integration, composer/end-to-end) with no layer-specific reason for the repetition.

## C. Clarity

**One source of truth.** Search for the same numeric literal or formatting rule appearing in more than one module, and for any value mirrored between TypeScript and CSS.

**Clean code.** Look for commented-out code, comments describing what changed or when rather than a constraint the code honors, exported symbols with zero consumers, and names that need a comment to be understood.

## C. Vocabulary

**Ubiquitous language.** Build a product-term → identifier map from `COPY-GUIDELINES.md` and list every concept that has two or more different names across the codebase.

## F. Boundaries and enforcement

**Module boundaries.** Look for cross-feature imports that reach past a feature's public surface, React imports in non-`.tsx` files, components importing more than two layers down, and barrel files that pull in side effects just by being imported.

## G. Smell sweep

Walk the catalogue in section G of `docs/CODE-QUALITY.md` and report per smell, so the review is repeatable rather than dependent on what the reviewer happened to notice this time. Treat the catalogue as open — add a smell to that table when you find one that is not listed there yet.
