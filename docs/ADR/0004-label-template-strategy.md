# ADR: Label template method and title-body fitting

**Status:** Accepted  
**Date:** 2026-08-02

## Decision

Express label composition steps through a `LabelTemplate` (Template Method) with `IdentityHeaderTemplate` as the first concrete template. Extract nested font-search loops into `TitleBodyFitter`. Carry resolved `columnLayout` on `LabelRenderModel` so the preview does not recompute layout geometry.

## Rejected alternatives

- **Keep all layout search nested inside `LabelComposer` / `LabelLayoutEngine`.** Harder to test and over the function-size budget.
- **Introduce a full plugin/layout engine.** Speculative generality for one product’s fixed thermal layouts.

## Why

The template isolates the identity-header algorithm; the fitter is a single unit of behavior with clear inputs/outputs; the render model is the one source of truth the preview reads.
