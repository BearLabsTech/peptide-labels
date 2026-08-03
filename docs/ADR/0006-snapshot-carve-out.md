# ADR: Snapshot carve-out for characterization goldens

**Status:** Accepted  
**Date:** 2026-08-01

## Decision

Allow `toMatchSnapshot` only in files named `*.golden.test.ts`. Those goldens pin the public `LabelRenderModel` contract across every catalog stock. `vitest -u` is never an acceptable way to clear a failure — snapshot changes require a deliberate decision and a commit note.

## Rejected alternatives

- **Ban snapshots entirely.** Hand-typed literals for every field of every stock are unreliable at this volume.
- **Allow snapshots in any test.** Encourages brittle assertions on incidental structure.

## Why

Characterization tests need a “identical to what shipped” assertion. Restricting the mechanism to golden files keeps the exception narrow and reviewable.
