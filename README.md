# Peptide Labels

Peptide Labels is a web app for designing **compact vial labels** with a **built-in calculator**, **live preview**, and **thermal-ready export**—so reconstitution and protocol numbers stay aligned on the sticker you print.

**Product documentation**

- [docs/FRD.md](docs/FRD.md) — functional requirements (what the app does and plans to do, and why)
- [docs/COPY-GUIDELINES.md](docs/COPY-GUIDELINES.md) — copy and compliance rules for user-facing text

---

## For developers

### Getting started

**Prerequisites**

- **Git** — to clone the repository.
- **Node.js** — use a current **LTS** release (this project is Vite + TypeScript; match what your team standardizes on if you have one).
- **npm** — ships with Node.js and is what the scripts in `package.json` assume.

**Local setup**

```bash
git clone <repository-url>
cd peptide-labels
npm install
npm run dev
```

- **`npm run dev`** — Vite dev server with hot reload.
- **`npm run build`** — typecheck and production build.
- **`npm run preview`** — serve the production build locally.
- **`npm run test:run`** — run the Vitest suite once (non-watch).
- **`npm run test`** — Vitest in watch mode while you work.

**Using an AI assistant to install everything**

If you want an assistant to walk you through a clean machine setup at **current** versions, paste something like the following (edit the path and OS if needed):

```text
I am setting up the peptide-labels project for local development on Windows (or macOS / Linux). The repo is already cloned at: <YOUR_PATH>/peptide-labels.

Please:
1. Confirm I have a suitable Node.js LTS and npm (or tell me exactly what to install and from where).
2. From the project root, run `npm install` and fix any peer or engine issues using compatible current versions.
3. Verify `npm run dev`, `npm run build`, and `npm run test:run` all succeed; if anything fails, diagnose and give concrete fixes.

Explain each step briefly so I understand what changed.
```

**Cursor and project rules**

This repo includes **Cursor rules** under `.cursor/rules/` that mirror the docs above for agents (`functional-requirements.mdc`, `terminology-compliance.mdc`) plus implementation rules (domain architecture, Vitest, thermal print, UI conventions, dependency scope). If you use **Cursor**, opening the project loads those rules automatically.

---

### Architecture conventions and ways of working

**Separation of concerns**

Keep **math**, **string composition / layout**, and **preview / export** clearly separated (see `.cursor/rules/domain-label-architecture.mdc`). Do not push calculation logic into the preview for convenience, or hide product rules in one-off UI hacks.

**Unit tests are required for new behavior**

- The test runner is **Vitest** (`npm run test:run`).
- **New or changed product behavior** should follow **red–green–refactor**: add or adjust a **failing test that states the obligation**, then implement until green.
- **Refactors that preserve behavior** should keep existing tests passing; you do not add tests merely because code moved.
- Calculator and resolver code is treated as **safety-sensitive**—prefer more coverage and adversarial edge cases, not less. Every bugfix in that area should include a **regression test**.
- Scope stays **unit tests only** (no browser E2E in this repo unless that policy changes).

**No “dirty” shortcuts**

Unacceptable patterns include: skipping or disabling tests to go green, deleting tests instead of fixing the product, loosening assertions without correcting behavior, or using `@ts-expect-error` / `@ts-ignore` to hide real type or logic problems. Prefer small, correct changes over quick hacks.

**Dependencies and UI stack**

Prefer a **lean dependency tree** and in-repo solutions over heavy frameworks. Ask before adding new npm packages unless the team has already agreed otherwise for that task. The web UI uses **plain CSS** (tokens in `src/index.css` and colocated stylesheets), not Tailwind—match existing patterns.

**Copy and terminology (contributors)**

See [docs/COPY-GUIDELINES.md](docs/COPY-GUIDELINES.md) for approved wording (e.g. Protocol / Draw Volume, Test Group / TG).
