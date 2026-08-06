# ADR: Ports and adapters for browser I/O

**Status:** Accepted  
**Date:** 2026-08-03

## Decision

Define port interfaces (`Rasterizer`, `ImageProcessor`, `FileDownloader`, `KeyValueStore`, `DesignLibrary`, `Scroller`, `TextMeasurer`) in `src/shared/ports.ts`. Implement them only in `src/platform`. App-layer use cases (e.g. `ExportLabelUseCase`) depend on ports, never on concrete browser APIs. Unit tests use in-memory fakes (`src/test/`) or domain-local deterministic defaults (e.g. `HeuristicTextMeasurer`).

## Rejected alternatives

- **Call `localStorage` / `IndexedDB` / `html-to-image` directly from feature modules.** Cheap initially; made export and persistence untestable without a DOM and blocked Humble Object extraction.
- **One mega “BrowserServices” interface.** Would force every caller to mock methods they do not use (interface segregation failure).

## Why

Dependency inversion at I/O boundaries lets the happy path of export and storage be unit-tested with fakes while keeping adapters thin enough to review by reading.
