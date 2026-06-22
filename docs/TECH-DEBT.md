# Tech debt and known issues

Tracked **bugs, print-quality gaps, and fix-up work** — not product roadmap items (those live in [FRD.md](./FRD.md)).

When an item is fixed, move it to **Resolved** with a one-line note (date + what changed).

---

## Open

### Print padding — exported PNG on Niimbot B21 (40×20 rounded stock)

**Priority:** High  
**Status:** Open — label stock profiles and reduced padding shipped; re-print test pending.

**Symptom:** Physical print had noticeably more white space than Niimbot editor/print preview, especially on the **left** (logo column).

**Shipped (Jun 2026):** Label stock selection (default **40×20 rounded**), unified per-stock padding (tighter on rounded), preview = export including corner clip, export DPI follows **selected printer** (skip/default **300 DPI**), capture targets label surface only.

**Still verify on hardware:** Niimbot rounded-template inset vs our padding; asymmetric left margin if it persists after re-print.

**Reference:** B21 phone test on `T40×20-320WHITE` rounded stock.

---

### Text print quality — raster export vs native Niimbot text

**Priority:** Medium (defer — follow up in a separate session/agent)  
**Status:** Open — **not a sizing issue**; typography/thermal output quality.

**Symptom:** Text from our **downloaded PNG** prints less cleanly than text typed directly in the Niimbot app on the same printer/stock. Visible in physical print photo (Jun 2026): edges look softer/blockier or less crisp than native Niimbot labels.

**Hypotheses to explore later:**

- `html-to-image` rasterization + browser font smoothing vs Niimbot’s native text renderer.
- Monochrome threshold step (`applyMonochromeThreshold`) — threshold, fattening grays to black.
- Niimbot **Contrast** slider (user often at 150) compensating differently for bitmap vs native text.
- Font stack (Arial in preview) at thermal resolution; subpixel/anti-aliasing artifacts.

**Out of scope for current padding/export-size work** unless a change clearly affects both.

---

### Compound name casing — do not default to all caps

**Priority:** Low  
**Status:** Open

**Symptom:** Compound name on the label is forced to uppercase (`LabelComposer` uppercases before layout; `LabelPreview.css` applies `text-transform: uppercase` on the title). Users may prefer mixed case as entered.

**When fixing:** Preserve user-entered casing in the model; reserve uppercase for section labels (RECONSTITUTION, PROTOCOL, etc.) and danger mode only if product agrees.

---

## Resolved

*(none yet)*
