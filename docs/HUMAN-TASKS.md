# Human-required tasks

Work that **cannot be completed by an agent**, because judging whether it is done needs a person, physical hardware, or a real-world measurement.

This is deliberately separate from [TECH-DEBT.md](./TECH-DEBT.md). Items here are not lower priority — a High item on this list can outrank everything in tech debt. They are here because no amount of code reading, testing, or browser automation can close them, so leaving them mixed in with agent-actionable work makes tech debt look permanently unfinishable and makes "no known debt" impossible to ever assert.

**An item belongs here when the verification step requires a human.** Some examples:

- printing a physical label and measuring or eyeballing the result
- judging whether output looks right against a real-world reference
- a decision only the product owner can make (though prefer recording those inline on the item they block)
- anything needing a device, account, or environment an agent cannot reach

**An agent may prepare an item here** — write the measurement procedure, add the code path a test would exercise, narrow the hypotheses — but must not mark it resolved, and must not "fix" it speculatively. A speculative fix to a hardware item is worse than no fix, because it consumes the one physical test that would have told you something.

**When a human completes one:** record the measurements or the judgement on the item, then either move it to **Done** here, or — if the answer turns it into ordinary code work — move it to `TECH-DEBT.md` with the findings attached.

---

## Open

### Print padding — exported PNG on Niimbot B21 (40×20 rounded stock)

**Priority:** High
**Blocked on:** a physical print from a Niimbot B21 on `T40×20-320WHITE` rounded stock.
**Status:** Label stock profiles and reduced padding shipped; re-print test pending.

**Symptom:** Physical print had noticeably more white space than the Niimbot editor's print preview, especially on the **left** (logo column).

**Shipped (Jun 2026):** Label stock selection (default **40×20 rounded**), unified per-stock padding (tighter on rounded), preview = export including corner clip, export DPI follows **selected printer** (skip/default **300 DPI**), capture targets the label surface only.

**Still to verify on hardware:** the Niimbot rounded-template inset versus our padding, and whether the asymmetric left margin persists after the re-print.

**Do not adjust `paddingMm` again without measurements.** It was already reduced once; a second blind change risks overshooting in a way no test or browser check can detect.

**Procedure when the hardware is available:**

1. Export a PNG from the app for the 40 × 20 rounded stock with the **B21 selected as printer**, so export DPI is the B21's 203.
2. Print it. Separately, compose an equivalent label directly in the Niimbot app with text at the same nominal size, and print that too.
3. On both physical labels, measure the white margin on each of the four edges in millimetres.
4. Record all eight measurements plus photos on this item. The questions they answer: is our margin symmetric, and is the left margin still wider than the others?
5. Only then adjust `paddingMm` for the affected stock in `src/print/printCatalog.ts` (currently `0.5` rounded, `1` rectangular) — one change, then re-print and re-measure.

**Reference:** B21 phone test on `T40×20-320WHITE` rounded stock.

---

### Text print quality — raster export vs native Niimbot text

**Priority:** Medium
**Blocked on:** physical prints at two DPIs, judged side by side against a native Niimbot label.
**Status:** Open — **not a sizing issue**; typography / thermal output quality.

**Symptom:** Text from our **downloaded PNG** prints less cleanly than text typed directly in the Niimbot app on the same printer and stock. Visible in a physical print photo (Jun 2026): edges look softer, blockier, or less crisp than native Niimbot labels.

**Four hypotheses, to be separated by experiment rather than reasoned about:**

- `html-to-image` rasterization plus browser font smoothing, versus Niimbot's native text renderer.
- The monochrome threshold step (`applyMonochromeThreshold`) — threshold value, and grays being fattened to black.
- The Niimbot **Contrast** slider (often set to 150) compensating differently for a bitmap than for native text.
- The font stack (Arial in the preview) at thermal resolution — subpixel and anti-aliasing artifacts.

**Do not change the monochrome threshold speculatively.** A threshold that looks better on screen can print worse, and the only judge is a physical label.

**Procedure when the hardware is available:**

1. Print the same label at both available DPIs (203 via B21, 300 via B21 Pro or M2), to establish whether this is a resolution mismatch rather than a rendering one.
2. Print with the Niimbot Contrast slider at its default and at 150.
3. Export one label at the current monochrome threshold and one with it moved, and compare stroke weight.
4. Print one label with a different font stack at the same size.
5. Record which hypothesis the prints actually support on this item. Then fix only that one.

---

## Done

_Nothing yet._
