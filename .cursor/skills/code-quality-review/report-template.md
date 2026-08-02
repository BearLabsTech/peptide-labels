# Review report template

Use this shape for the review's output before routing findings to their canonical documents (`docs/TECH-DEBT.md`, `docs/FRD.md`, or a new plan). Do not skip the per-standard verdict table — it is what proves every standard was actually checked rather than skipped.

```markdown
# Code quality review — <date>

## Scope

What was reviewed (whole repo / specific phase's output / specific feature) and what pass-1 angles were used.

## Findings

Ordered: novel first, then recurrences, then analogues. Within each group, ordered by severity (bug/compliance violation before stylistic debt).

### <Novel | Recurrence | Analogue>: <one-line title>

- **Standard violated:** `docs/CODE-QUALITY.md` section <letter> — <standard name>
- **Location:** `path/to/file.ts:startLine-endLine`
- **Evidence:**

\`\`\`ts
// quoted snippet
\`\`\`

- **Severity:** <Bug | Compliance violation | Stylistic debt>
- **Recommended change:** <what to do, one or two sentences>
- **If recurrence/analogue:** which `known-findings.md` entry this matches, and how it differs (if at all) from the original.

<repeat per finding>

## Per-standard verdict

Every standard in `docs/CODE-QUALITY.md`, including the ones with no findings.

| Section | Standard | Verdict | Evidence examined |
|---|---|---|---|
| A | Separation of responsibilities | Clean / Findings above | <what was checked to reach this verdict> |
| A | SOLID (5 sub-rows or one combined row) | ... | ... |
| A | Small units, with budgets | ... | ... |
| A | Design pattern policy | ... | ... |
| B | Illegal states unrepresentable | ... | ... |
| B | Authored vs. derived | ... | ... |
| B | Immutability by default | ... | ... |
| C | Clean code | ... | ... |
| C | One source of truth | ... | ... |
| C | Ubiquitous language | ... | ... |
| D | One error convention | ... | ... |
| D | Recoverable failure UX | ... | ... |
| E | Behavior over implementation | ... | ... |
| E | Characterization tests | ... | ... |
| E | Test data builders | ... | ... |
| E | Coverage as a ratchet | ... | ... |
| F | Enforced module boundaries | ... | ... |
| F | Accessibility | ... | ... |
| F | ADRs | ... | ... |
| G | Smell sweep (per smell in the catalogue) | ... | ... |

## Numbers

- `npm run test:coverage` result: lines / statements / branches / functions.
- File-size sweep: functions over 30 lines, classes/modules over 200, components over 120 — count and top offenders.

## Routing

- **To `docs/TECH-DEBT.md`:** <list, or "none">
- **To `docs/FRD.md`:** <list, or "none">
- **To a new plan** (work large enough to need sequencing): <summary, or "none">
- **To `known-findings.md`:** new patterns appended this review, or "none — all findings matched existing patterns" (which itself is worth a sentence of comment: does that mean the codebase is stable, or that pass one was too shallow?).
```
