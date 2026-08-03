# ADR: Layered feature structure

**Status:** Accepted  
**Date:** 2026-08-03

## Decision

Organize each feature as UI → app/use-case → domain, with shared I/O adapters in `src/platform`, shared print infrastructure in `src/print`, and cross-feature contracts in `src/shared`. Features (`label`, `customDesign`, `landing`) must not import each other.

## Rejected alternatives

- **Reorganize the whole tree into top-level `domain/` / `application/` / `ui/` folders.** Higher blast radius and noisier diffs for little gain once features already had clear module names.
- **Allow features to import each other “just for shared helpers.”** That is how `customDesign`→`label` coupling grew; shared code now lives in `app/`, `print/`, or `shared/` instead.

## Why

Layer lint (`no-restricted-imports` in `eslint.config.js`) only works if the intended homes are stable. Keeping layers inside feature folders preserves short imports while still enforcing dependency direction.
