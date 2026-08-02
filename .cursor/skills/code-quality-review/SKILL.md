---
name: code-quality-review
description: >-
  Runs a full code quality and architecture review of the codebase against
  docs/CODE-QUALITY.md. Use when the user asks for a total code quality
  review, an architecture review, a refactor plan, or asks what should be
  cleaned up.
disable-model-invocation: true
---

# Code quality review

A repeatable, two-pass review. **The ordering is the whole design.** Pass one reasons from the standards against the actual code with no checklist in context. Pass two uses past findings only as a recall aid. Reversing the order produces a review that finds exactly the known issues and nothing else — which is a failed review.

**A review whose findings all come from `known-findings.md` means pass one was skipped or rushed.** The known list exists to catch what you missed, not to define what to look for. Finding nothing new on a codebase this size is not a passing grade — it is a signal to redo pass one more carefully.

## Pass 1 — principle-driven and open-ended

1. **Read the canonical docs first:** [docs/CODE-QUALITY.md](../../../docs/CODE-QUALITY.md), [docs/FRD.md](../../../docs/FRD.md), [docs/TECH-DEBT.md](../../../docs/TECH-DEBT.md), [docs/COPY-GUIDELINES.md](../../../docs/COPY-GUIDELINES.md). Product intent decides whether something is debt or a deliberate trade-off; existing TECH-DEBT entries prevent re-reporting known items as new discoveries.
2. **Do not read `known-findings.md` yet.** Reading it first is what causes tunnel vision.
3. **Fan out with parallel explore subagents, one per angle rather than one per directory.** Angles that have produced non-overlapping results before: architecture map and file sizes; domain logic and code smells; tests and UI layer; error handling and failure UX; immutability and module boundaries; vocabulary versus canonical terms; illegal states and test fixture duplication. Treat this as a starting set, not a fixed list — adjust to what is actually in front of you. Every subagent prompt must demand exact paths, line numbers, and quoted snippets, and must state it is read-only.
4. **Work each standard in `docs/CODE-QUALITY.md` as a question, not a checkbox:** what in *this* code violates this principle, including in ways nobody has seen before? Use [heuristics.md](heuristics.md) for reasoning prompts and the mechanical checks that operationalize each one.
5. **Run the numbers:** `npm run test:coverage` for the current baseline, plus a file-size sweep (see heuristics.md, "Unit size").

## Pass 2 — recall aid

1. **Now read [known-findings.md](known-findings.md).** Check two things: did any past finding recur, and does any past finding have an **analogue** here — the same kind of mistake in a different place? Analogues are the higher-value output; an exact recurrence usually means a fix regressed and is worth flagging as such.

## Both passes

1. **Verify before reporting.** Subagent output can be wrong or stale. Open the cited file yourself and confirm the line before it goes in the report.
2. **Order the report: novel findings first, then recurrences, then analogues.** Within each group, order by severity, separating real bugs and compliance violations from stylistic debt.
3. **Give a verdict on every standard in `docs/CODE-QUALITY.md`, including the clean ones**, naming what you examined to reach that verdict. A section with no findings must say so explicitly and show the evidence — this is what stops a standard from being silently skipped.
4. **Route the output, do not dump it in chat.** Bugs and quality gaps go to `docs/TECH-DEBT.md` per `future-work-tracking.mdc`, tagged with the `docs/CODE-QUALITY.md` section/standard they violate. Work large enough to need sequencing becomes a plan. Roadmap-shaped items go to `docs/FRD.md`. Use [report-template.md](report-template.md) for the shape of the review output itself before routing.
5. **Feed the loop.** Append genuinely new findings to `known-findings.md`, dated, written as patterns (see that file's own instructions) — this is the only way the specific-findings list stays useful instead of frozen at whatever the first audit happened to catch.

## Verify

Run this skill against the repo after a phase of work lands. A good result rediscovers nothing already fixed, nothing already listed in TECH-DEBT, and produces at least one genuinely new finding. If pass one yields nothing new on a codebase this size, the pass one execution needs to be redone more thoroughly, not accepted as clean.

## Reference files

- [heuristics.md](heuristics.md) — reasoning prompts per standard, plus the mechanical checks that operationalize each one. Read during pass 1, step 4.
- [known-findings.md](known-findings.md) — accumulating record of what past reviews found. Read only in pass 2.
- [report-template.md](report-template.md) — output shape for the review itself.
