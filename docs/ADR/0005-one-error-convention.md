# ADR: One error convention (Result vs throw)

**Status:** Accepted  
**Date:** 2026-08-02

## Decision

Use `Result<T, E>` (`src/shared/result.ts`) for expected, recoverable failures (parse/validation, storage quota, export failure surfaced to the user). Use `throw` only for programmer errors (broken invariants, impossible states). Validation of design documents returns `{ ok, document } | { ok: false, issues }` matching that shape.

## Rejected alternatives

- **Throw for every failure and catch in the UI.** Easy to miss a catch; produced white-screen risk (e.g. unresolved print target in a `useMemo`).
- **Ad-hoc `{ success, error }` / `null` / string unions per module.** Multiple conventions hid which failures callers must handle.

## Why

One convention makes call sites predictable and pairs with the workspace error boundary for the rare true throw.
