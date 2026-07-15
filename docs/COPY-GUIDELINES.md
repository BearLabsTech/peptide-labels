# Copy and compliance guidelines

This document is the **canonical source** for wording rules in Peptide Labels. It is written for contributors editing user-facing text—whether or not you use Cursor. Cursor loads the same rules via [.cursor/rules/terminology-compliance.mdc](../.cursor/rules/terminology-compliance.mdc), which points here.

When you add or change a copy rule, **update this file** in the same change set. Do not let the Cursor rule and this document drift apart.

---

## Protocol and measurement language

### Do not use “dose”

The word **dose** must not appear **anywhere** in this project—code, UI, tests, user or developer documentation, commit messages, PR descriptions, branch names, or other artifacts.

The **only** permitted use of the literal word is **in this file**, where the rule itself is defined (including the table below).

That includes **source code**: identifiers, types, properties, function names, file names, string literals, and comments must not use `dose`, `Dose`, `DOSE`, or variants. UI labels and code names must stay aligned—do not name a variable `dose` while the screen says “Protocol.”

Use context-appropriate alternatives:

| Avoid | Prefer |
|-------|--------|
| dose (regimen on the label) | **Protocol** |
| dose (amount per administration) | **Measure** or **Amount** |
| dose (units on the pen) | **DrawVolume**, **protocolUnits**, or **Draw Volume** in UI copy |

**Rationale:** “Dose” carries clinical connotations this app does not claim. The label describes preparation and protocol information the user chose to print—not medical advice.

---

## Compound amount and container capacity

Keep substance quantity, vial capacity, and syringe capacity distinct:

- **Compound amount** — the mg or IU contained in the vial.
- **Vial capacity** — the physical liquid capacity of the vial in ml.
- **Syringe capacity** — the physical liquid capacity of the syringe in ml.

Do not label the compound amount field only “Vial” or “Vial Amount,” and do not use “Vial size” when the value specifically means liquid capacity.

---

## Community testing (Test Group)

For community testing references:

- Use **Test Group**, not “Group Test”.
- The acronym is **TG** (e.g. “TG COA” on the label).

Apply this in UI labels, QR captions, docs, and any user-visible reference to group testing COAs.

---

## Supporting the project

When referring to optional financial support from users (for example on the landing page):

- Use **contribute**, **contribution**, or **support the project** — not **donate**, **donation**, or similar wording.
- There is **no required amount**; the user chooses what feels fair.
- **Suggested prompt:** “If you got value from the app, consider a $5 contribution.”
- Offer **credit card** and **cryptocurrency** as payment options where the product supports contributions (see [FRD.md](./FRD.md)).

**Rationale:** “Contribution” fits optional community support without implying charity, tipping, or a transactional purchase. Keep the same terms in UI, code identifiers, and docs once this ships.

---

## User agreement content

The research-use / user agreement **body** lives in [`src/content/user-agreement.md`](../src/content/user-agreement.md)—not in React components.

- Edit that markdown file to change agreement wording.
- When the agreement text changes in a way that requires re-acknowledgment, bump [`src/content/userAgreementVersion.ts`](../src/content/userAgreementVersion.ts) (`USER_AGREEMENT_VERSION`) in the **same** change set.
- Components may contain chrome only (for example “I understand”, “Research” badge labels)—not the legal/product agreement paragraphs.

**Rationale:** Contributors should update copy without hunting through UI code; version bumps force returning users to acknowledge material changes.

---

## Where these rules apply

Everything in the repository, with the single exception noted above for defining the “dose” prohibition in this file. In practice that means:

- **Source code** — identifiers, types, files, literals, and comments (see § Do not use “dose”).
- **UI strings** — sidebar, preview, buttons, placeholders.
- **Tests** — assertions, fixtures, and describe/it titles.
- **Documentation** — [FRD.md](./FRD.md), README, and other docs (do not quote “dose” as product language).
- **Version control** — commit messages, PR titles and bodies, branch names when they describe the product.

---

## Changing these guidelines

1. Edit this file with the new or revised rule and a short rationale if helpful.
2. Implement the copy change in the product.
3. Confirm [.cursor/rules/terminology-compliance.mdc](../.cursor/rules/terminology-compliance.mdc) still points to this file (no duplicate rule bodies in the `.mdc` file).

Functional *what the product does* belongs in [FRD.md](./FRD.md), not here.
