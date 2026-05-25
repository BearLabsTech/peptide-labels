# Peptide Labels — Functional Requirements

This document describes what Peptide Labels does today and what is planned next. It is written for anyone who needs to understand the product—without implementation detail, step-by-step instructions, or copy-compliance rules (those live in [COPY-GUIDELINES.md](./COPY-GUIDELINES.md)).

---

## Today

### Overview

Peptide Labels helps you design **small adhesive labels** for peptide (and similar) vials—labels you can print on common **thermal label printers** and stick on the vial itself. Instead of juggling spreadsheets to keep concentration, draw volume, and water volume aligned, you enter what you know and the app **keeps the numbers consistent** on the label you are about to print.

The experience is a single screen: a structured sidebar for everything that might belong on the label, and a **live preview** sized like the real sticker. When your label looks right, you download a **high-contrast image** ready for thermal printing. The app is built so the flow feels obvious without a separate user manual.

---

### Design your label

When you open the app, you see how a finished label can look—a sample compound fills the preview so you are not staring at a blank canvas. As soon as you start entering your own details, that example gives way to **your** label. Export stays tied to your real work: you download when you are designing something you intend to print, not the placeholder sample.

The preview always reflects what you are building **at true label proportions**, so you are not guessing how cramped lines will be on a tiny sticker. You control **what actually prints**: turn whole topic areas on or off, and within an area choose line by line what appears on the physical vial. That way a minimal label stays minimal, and a detailed traceability label stays detailed—your choice.

---

### Compound identity

The label answers the first question on every vial: **what is this?** You name the compound and how much is in the vial (milligrams or international units). That identity anchors everything else—the calculator, the protocol line, and the filename when you export.

When you need a clear warning that material has **not been tested**, you can mark the vial as untested. The label shifts to an unmistakable caution treatment so anyone handling the vial sees the risk before they rely on the numbers below it.

---

### Reconstitution

Mixed vials forget their own story quickly. Reconstitution on the label records **how you prepared it**: how much liquid you used, what kind of liquid (bacteriostatic water, sterile water, saline, or unstated), and **concentration** the app derives from your vial size and water volume so you are not doing mental math at the bench.

You can date the mix with a calendar or in your own words (“Mixed Jan 1st”) when that reads better on a small label. Like every other topic, you decide whether the whole reconstitution block prints and which individual lines (water, concentration, date) appear.

---

### Built-in calculator

Inconsistent numbers on a vial label are worse than missing numbers—they look authoritative and mislead. The calculator exists so **one change does not silently desync the rest**.

If you know vial amount, water volume, and protocol amount, the app can work out **draw volume** and concentration for you. If you already know draw volume and protocol amount, it can work out **how much water** you needed. Enter only vial and water and you still get a useful **concentration** line even before protocol is filled in.

The app keeps **milligram/microgram** and **IU** worlds consistent: an IU vial pairs with IU on the protocol side. When you change one driving input, related fields refresh in a sensible direction so you are always looking at a coherent set of values, not a patchwork of stale and new numbers.

---

### Protocol on the label

The app helps you keep **your protocol on the vial**, so you always know what to measure and how often without digging through another app or a spreadsheet. You enter protocol amount and frequency; when you think in insulin-pen **units**, the label can show draw volume derived from your other inputs.

You choose exactly which protocol lines print—amount, draw volume, frequency—so the sticker stays readable on the smallest stock.

---

### Sourcing and traceability

The app lets you **keep track of where a vial came from**: vendor, group buy, batch or lot, and when it was batched. That context travels with the physical vial, so months later you still know what you are holding and can match it to paperwork or community discussion.

As with other sections, you can print the whole sourcing block or only the lines you care about (for example vendor and lot without group buy).

---

### Trust and paperwork

Links to certificates of analysis belong on the label when you want **one scan to verify** what you are holding. You can attach vendor, group buy, **Test Group**, and personal COA URLs, plus **two named custom COA slots** for anything else you rely on.

When you provide a valid link, the label can show a **QR code** labeled for that source—Vendor COA, Group Buy COA, TG COA, My COA, or your custom names—so verification does not depend on typing a long URL from a tiny sticker.

---

### Make it yours

Dates on the label can follow **how you already think about dates**—compact numeric forms, ISO-style dashes, US or European day/month order—applied consistently wherever a date prints.

An optional **logo** sits beside the text so shared group buys or your own stash are instantly recognizable on the shelf. You can remove it anytime; the label works fine without branding.

---

### Ready to print

Thermal printers need **sharp black and white**, not subtle grays from a screen capture. Export produces a **monochrome PNG** tuned for common **203 DPI** class devices—the kind many hobby and bench setups use for Niimbot-style stock.

The download name reflects your compound when you have named one, so saved files are easy to find later. Today’s label size targets **3 ml vials**—a compact sticker matched to small adhesive stock.

---

## Planned

Items below are ordered **easiest to hardest** to implement. Where one feature depends on another, the prerequisite comes first.

---

### Landing page and entry paths

Before the label designer, the product will offer a **landing page** that sets expectations up front: Peptide Labels is for **research use only**, not medical advice, with clear compliance language and a user agreement to acknowledge before continuing.

From there you will choose how to use the app—**calculator only** or **full label designer**—instead of landing directly on the design screen. That split keeps a lightweight path for people who only need the math today, while leaving room for a broader product (accounts, saved data, more tools) later without rewriting the core flow.

---

### Calculator-only mode

Not every visit ends in a printed label. A dedicated **calculator mode** gives you the same consistent reconstitution math without the label chrome—useful at the bench when you only need draw volume or water volume worked out.

When the numbers look right, the app can ask whether you want to **turn this into a label**. Say yes and you move to the label designer with calculator fields **already filled**, so you are not retyping vial amount, water, protocol, and derived values.

*Requires: landing page and entry paths.*

---

### Support the project

The landing page will include an optional way to **contribute** if the app has been useful—no paywall, no required amount. Copy along the lines of *if you got value from the app, consider a $5 contribution* sets a gentle suggestion without prescribing what support should look like; you choose what feels fair.

**Credit card** checkout lowers friction for most people. **Cryptocurrency** will be offered as well for contributors who prefer more **privacy** when supporting community tools. Contributing stays entirely optional and separate from using the calculator or label designer.

*Requires: landing page and entry paths.*

---

### User-selected label size

Today’s export assumes one label footprint matched to common **3 ml** stock on Niimbot-class printers. In practice, **thermal printers and adhesive stock vary**: the sticker that fits a 3 ml vial on one device may not match another maker’s rolls.

Rather than shipping a new fixed size every time someone’s printer differs, the product will let you **choose label dimensions** (width and height) that match what you actually load in the printer. Preview and export will follow your selection so the PNG you download matches real stock—not a single hard-coded profile per vial size.

---

### Larger vials (10 ml)

Many users keep **larger vials** that deserve more room on the sticker for lines and QR codes. The product will add a **10 ml vial profile** alongside 3 ml, wired into the same vial-and-label selection flow above so preview and export stay aligned with your printer and stock.

Until then, everything in **Today** assumes the 3 ml profile and today’s default label footprint.

*Requires: user-selected label size (flexible dimensions and preview/export scaling).*

---

### Printer-guided label selection

Manual dimensions help power users; most people just want **“it works on my printer.”** The product will maintain a **curated list of common thermal label printers**. You pick your printer and **vial size** (for example 3 ml or 10 ml); the app suggests the **label size** that typically fits that combination.

When a printer supports **more than one plausible stock size** for the same vial, you choose which roll you use—no guesswork, but no false certainty either. This sits alongside free-form dimensions: guided setup when you want it, full control when you need it.

*Requires: user-selected label size; benefits from the 10 ml vial profile when that exists.*

---

### Section styling options

The current layout prioritizes readability on the smallest labels with a consistent type treatment. Planned styling controls will let you tune **how each section looks on the label**—starting with **font choices per section** (compound, reconstitution, protocol, sourcing, and so on) so a minimal label can stay minimal and a branded group-buy label can feel distinct, within what still fits on small stock.

*Benefits from flexible label sizes so typography choices remain legible across dimensions.*

---

### Additional label templates

Beyond the single layout in **Today**, the product will offer **additional templates**—alternative arrangements of the same information (hierarchy, spacing, which blocks dominate visually) that you pick before or while designing. New templates will respect the same calculator, compliance, and print-target rules; they change **presentation**, not the underlying math or data model.

*Benefits from flexible label sizes and a stable layout engine; more work per template than section styling alone.*

---

### Color label export

Most of **Today** is built around **monochrome thermal** output—sharp black on white for 203 DPI class devices. Some label printers support **color stock or color printing**, which may change preview, export format, and how emphasis (for example untested warnings) appears on the physical sticker.

Color support is planned as a **print-target option** once requirements are clearer: what file types and color spaces those printers expect, whether the live preview should mirror color, and which design elements benefit from color versus staying high-contrast for legibility. Until then, export remains monochrome-first.

*Benefits from a settled print-target model (dimensions, DPI, and optional templates/styling).*

---

### Accounts and saved data

In a later phase, **account creation** will let you sign in and keep a small set of **personal defaults** across sessions: a **logo** ready for labels, **saved protocols**, and other repeat entries you should not have to retype for every vial.

That layer builds on the landing page and calculator/designer split—research-use acknowledgment and lightweight calculator access stay available without an account; saved data is for people who print often and want their bench setup to follow them.

*Requires: landing page and entry paths (and ideally calculator-only mode); largest scope—identity, storage, and persistence.*
