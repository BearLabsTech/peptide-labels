# ADR: Pixel reference scope — one stock

**Status:** Accepted  
**Date:** 2026-08-01

## Decision

At each phase exit, re-compare a rasterized PNG only for the default **40×20 rounded** stock against `docs/reference-exports/40x20-rounded.png`. Other catalog stocks stay covered by numeric `LabelComposer.golden.test.ts` snapshots, not pixel diffs.

## Rejected alternatives

- **Capture and re-compare every `PRINT_CATALOG` stock via browser automation at every phase exit.** Judged too time-consuming for the marginal catch rate (a pure pixel regression without render-model change is rare).
- **Skip pixel checks entirely.** Would miss CSS/print-target drift that goldens do not see.

## Why

One fixed input on the default skip target is enough for a standing visual contract; expanding scope needs an explicit product decision.
