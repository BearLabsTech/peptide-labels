# Peptide Labels

## Purpose

Peptide Labels is a small web app for designing **compact vial labels** you can print on common **203 DPI thermal printers** (for example Niimbot-style devices). A **built-in calculator** helps you stay consistent: as you enter reconstitution and protocol details, the app can **derive related values** (for example concentration, draw volume, or water volume—depending on what you type) so the label reflects coherent numbers without manual spreadsheet work.

You fill in an accordion **sidebar** organized by topic—compound identity, reconstitution, protocol, source and batch, certificates of analysis (COAs), and personalization—and see a **live preview** sized like a real label. On the label you can combine, when you choose to show them:

- **Compound** — name, vial amount (mg or IU), and optional **untested** emphasis (“danger mode”) when you need a clear visual warning.
- **Reconstitution** — how much liquid you used, the liquid type, **concentration** (often filled in for you), and **reconstitution date** (calendar or free text).
- **Protocol** — protocol amount and measure unit (mcg, mg, or IU as applicable), **draw volume** in units when that is the driving line, and **frequency** (for example weekly).
- **Source** — vendor, group buy name, batch or lot number, and **batch date**.
- **Trust and paperwork** — URLs for vendor, group buy, **Test Group (TG)**, and personal COA links, plus **two custom-named COA** slots; matching content can appear as **QR codes** on the label.
- **Personalization** — global **date format** for printed dates and an optional **logo** image beside the text.

Section-level and per-field controls let you **omit** anything you do not want on the physical label. When you are ready, you export a **high-contrast monochrome PNG** suited to thermal print heads.

## Features (overview)

- **Sidebar + calculator workflow** — structured inputs with derived fields so numbers stay aligned (see **Purpose** above for everything you can put on a label).
- **Live preview** — layout matches a fixed label size on screen and in export.
- **Fine-grained printing** — master toggles per section plus per-field visibility for the physical label.
- **Thermal-ready export** — PNG download with a monochrome pipeline aimed at **203 DPI** devices and clean black/white output.

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

This repo includes **Cursor rules** under `.cursor/rules/` (domain architecture, Vitest expectations, thermal print constraints, UI conventions, terminology, and dependency scope). They are written for both humans and coding agents. If you already use **Cursor**, opening the project there is often the smoothest way to get consistent help, because those rules load automatically in context.

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

**Terminology (contributors)**

User-facing concepts and docs in this project avoid the word **“dose”**; use terms such as **Protocol**, **Measure**, **Amount**, or **Draw Volume**. 
