# ADR: Pure calculator reducer

**Status:** Accepted  
**Date:** 2026-08-02

## Decision

Own calculator transitions in a pure `calculatorReducer` driven by discriminated events. React holds state with `useReducer`; views dispatch events and do not compute next authored/derived values themselves. Solve modes are a frozen `SolveStrategy` registry.

## Rejected alternatives

- **Keep imperative form handlers scattered across the calculator view / sync helpers.** That produced conflicting defaults and ~80–120 guard sites around illegal combinations.
- **A general-purpose state library (Redux, Zustand, etc.).** Rejected under the no-new-dependencies constraint; a local reducer is enough.

## Why

A pure reducer makes calculator behavior unit-testable without React, and the strategy registry keeps each solve mode open for extension without editing a shared switch.
