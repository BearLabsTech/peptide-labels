# Pre-complexity sweeps closeout (2026-08-04)

Verification for plan action 10. Compares Phase 8 mechanical numbers and walks Phase 8 **Routing** (~853–890 of `docs/reviews/2026-08-03-blind-review.md`).

## Mechanical counts

| Metric | Phase 8 (~2026-08-03) | After sweeps (2026-08-04) |
| --- | ---: | ---: |
| Test files | 53 | 64 |
| Tests | ~530 | 611 |
| Statements (threshold / measured) | 85 / ~87.7% | 90 / ~90.7% |
| Branches | 85 | 89 / ~89.7% |
| Functions | 85 | 90 / ~90.7% |
| Lines | 85 | 92 / ~92.3% |
| Suite wall time | ~11–13 s | ~12–13 s |
| Golden snapshots | locked | unchanged through actions 1–9 |

Coverage excludes are honest (Humble Object UI + thin adapters only). Pure view-models and helpers are no longer excluded by false `use*` naming.

## Routing walk (Phase 8 list)

| Item | Disposition |
| --- | --- |
| `PRINT_CATALOG` mutability | **Resolved** — `deepFreeze` in `printCatalog.ts` |
| Two migration tables (print + design) | **Resolved** — quality follow-up Phase A |
| IndexedDB `list()` skip/report + clone | **Resolved** — sweep action 3 |
| QR caption metrics / CSS fallbacks | **Resolved** — quality follow-up + Phase B |
| Preview fitting (title/body) | **Resolved** — quality follow-up Phase B |
| mg/IU sub-1 formatting | **Resolved** — quality follow-up |
| Banned word “dose” in `CODE-QUALITY.md` | **Resolved** — doc cleaned |
| Solve-mode branching (`SolveStrategy`) | **Resolved** — quality follow-up Phase A |
| Coverage excludes honesty / `use*` rename | **Resolved** — sweep action 6 |
| `parseNumericField` / `Number(…) \|\| 0` / Result unification | **Deferred** — error-convention plan (inventory in sweeps plan Deferred section) |
| `DEFAULT_DRAW_UNITS_PER_MG` tri-purpose | **Open** — `docs/TECH-DEBT.md` |
| Duplicate-export guard false failure | **Resolved** — `useLabelExport` returns `{ ok: true }` when already exporting |
| `aria-describedby` / a11y | **Partially resolved** — concrete fix in `FormInputs`; `jsx-a11y` decision still Open in TECH-DEBT |
| Dead code (`units.ts`, print index re-exports) | **Resolved** — Phase 8.4 / earlier |
| Stale comments / vialMl fallbacks | **Open** — vialMl fallbacks in TECH-DEBT; stale comments opportunistic |
| Re-export shims / IndexedDB asymmetry | **Resolved** (asymmetry via action 3); shims cleaned earlier |
| Nine recurring patterns → known-findings | **Done** — appended 2026-08-04 (plus two new patterns) |
| Error-convention inventory → next plan | **Done** — see sweeps plan Deferred; next plan owns implementation |

## Handoff

Next plan: **error-convention convergence** (parse boundary, Result vs throw, no silent `0` coercion). Do not start until the developer opens that plan.
