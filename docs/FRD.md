# Peptide Labels — Functional Requirements

This document describes what Peptide Labels does today and what is planned next. It is written for anyone who needs to understand the product—without implementation detail, step-by-step instructions, or copy-compliance rules (those live in [COPY-GUIDELINES.md](./COPY-GUIDELINES.md)).

---

## Today

### Overview

Peptide Labels helps you design **small adhesive labels** for peptide (and similar) vials—labels you can print on common **thermal label printers** and stick on the vial itself. Instead of juggling spreadsheets to keep concentration, draw volume, and water volume aligned, you enter what you know and the app **keeps the numbers consistent** on the label you are about to print.

You start on a **landing page** that frames the product for **research use only** (not medical advice) and asks you to acknowledge a versioned user agreement before continuing. From there you choose **Calculator** or **Label designer**. Inside the app you can switch modes anytime; fields you already entered stay filled.

---

### Landing and entry

Before the tools open, a short landing screen presents the product name and two equal paths—**Calculator** or **Label designer**. A blocking agreement explains research-use expectations; acknowledging it is required for the current agreement version. If the agreement text is updated and the version advances, you will be asked to acknowledge again. Closing or ignoring the agreement does not unlock the app.

---

### Calculator mode

Not every visit ends in a printed label. **Calculator mode** gives the same reconstitution math without label chrome—assist modes, compound and protocol inputs, and a clear Results panel with water, concentration, draw units, and a syringe scale (default **1 ml** capacity; you can switch to smaller insulin syringes). The default assist path is **Set Draw Volume**: enter compound amount and protocol amount, get a round draw suggestion (**10 units per mg**, or **5 units per mg** when 10× would exceed 50 units), and let water fall out even when it is uneven. Quick-pick draw values progress predictably in **5-unit steps through 50**, then **10-unit steps through the selected syringe’s capacity**. Assisted defaults keep recommended water between **1 ml** and the selected **vial capacity**, which defaults to **3 ml**; pill-button quick picks offer 3, 5, 10, 20, and 30 ml alongside a custom capacity field that accepts values of at least 1 ml. User-selected values outside that recommended range remain allowed and show a warning when water exceeds vial capacity. You can switch to **Set Concentration** or **Manual Entry** when that fits better. Protocol amount cannot exceed compound amount; oversized draws versus the selected syringe warn without changing your numbers.

When the numbers look right, **Turn this into a label?** asks whether to open the label designer with those values already filled. A mode switch in the header flips between calculator and designer without wiping shared fields.

---

### Design your label

When you open the app, you see how a finished label can look—a sample compound fills the preview so you are not staring at a blank canvas. As soon as you start entering your own details, that example gives way to **your** label. Export stays tied to your real work: you download when you are designing something you intend to print, not the placeholder sample.

The preview always reflects what you are building **at true label proportions**, so you are not guessing how cramped lines will be on a tiny sticker. You control **what actually prints**: turn whole topic areas on or off, and within an area choose line by line what appears on the physical vial. That way a minimal label stays minimal, and a detailed traceability label stays detailed—your choice.

On compact screens, the preview and design controls share one continuous scrolling workspace, so every input remains reachable below the preview.

---

### Compound identity

The label answers the first question on every vial: **what is this?** You name the compound and its **compound amount** (milligrams or international units). The **compound name and compound amount print on separate lines** in a **title band above** the logo, section boxes, and testing column—centered on the center column but using the **full label width** for wrapping so long names stay readable. That identity anchors everything else—the calculator, the protocol line, and the filename when you export.

When you need a clear warning that material has **not been tested**, you can mark the vial as untested. The label shifts to an unmistakable caution treatment so anyone handling the vial sees the risk before they rely on the numbers below it.

---

### Reconstitution

Mixed vials forget their own story quickly. Reconstitution on the label records **how you prepared it**: how much liquid you used, what kind of liquid (bacteriostatic water, sterile water, saline, or unstated), and **concentration** the app derives from compound amount and water volume so you are not doing mental math at the bench.

You can date the mix with a calendar or in your own words (“Mixed Jan 1st”) when that reads better on a small label. Like every other topic, you decide whether the whole reconstitution block prints and which individual lines (water, concentration, date) appear.

---

### Built-in calculator

Inconsistent numbers on a vial label are worse than missing numbers—they look authoritative and mislead. The calculator exists so **one change does not silently desync the rest**.

If you know compound amount, water volume, and protocol amount, the app can work out **draw volume** and concentration for you. If you already know draw volume and protocol amount, it can work out **how much water** you needed. Enter only compound amount and water and you still get a useful **concentration** line even before protocol is filled in.

When you know your protocol amount but want simpler bench math, you can choose how the calculator solves for water volume. **Set Draw Volume** is the default: enter **draw units** (suggested at **10 units per mg**, or per IU; when that would exceed **50 units**, the suggestion uses **5 units per mg** / IU instead) and the app works backward to the water volume you need—water need not be a round number. System-generated draw and concentration defaults are adjusted when needed so they recommend water from **1 ml through the selected vial capacity**. This is a recommendation, not a restriction: a draw, target concentration, or Manual Entry water amount chosen by the user remains unchanged outside that range, with a warning when it exceeds vial capacity. **Set Concentration** lets you enter a **target concentration** (mg/ml—or IU/ml for IU compounds); **the concentration you enter is what prints on the label**—math stays full precision, and ml / units / concentration are rounded to **three decimal places for display only**, so draw units and the concentration line stay tied to your target, not a back-calculated drift from a rounded water volume. **Manual Entry** is available when you already know water. **Water volume and concentration are not calculated or printed until you enter compound amount**—without that, the app cannot know concentration, so it defaults draw units to a flat **10 units** placeholder rather than guessing wrong math until compound amount is present.

The app keeps **milligram/microgram** and **IU** worlds consistent: an IU vial pairs with IU on the protocol side. When you change one driving input, related fields refresh in a sensible direction so you are always looking at a coherent set of values, not a patchwork of stale and new numbers. Field order does not matter: enter protocol before vial, or vial before protocol, and the app recalculates once enough information is present.

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

The right column on the label is a **testing column**: a compact place for verification at a glance without relying on tiny QR codes alone.

**Test result indicators** show whether common checks were **passed**, **failed**, or **not run**—Mass, Purity, LC/MS, Endotoxin, Sterility, Heavy Metals, and Fentanyl—using high-contrast box marks that stay readable on small thermal stock. Each test defaults to **Do Not Print**; only the checks you choose appear on the label. Turn indicators on when you want the vial to show testing status without opening a certificate; keep full COA links in the sidebar for your records even when QR codes are off the label.

**COA QR codes** remain optional. You can attach vendor, group buy, **Test Group**, and personal COA URLs, plus **two named custom COA slots**. When you choose to print them, each valid link becomes a QR code labeled for that source—Vendor COA, Group Buy COA, TG COA, My COA, or your custom names. You can print indicators only, QR codes only, or both; when either is active, you **widen or narrow the testing column** so the center text area adjusts to match.

---

### Make it yours

Dates on the label can follow **how you already think about dates**—compact numeric forms, ISO-style dashes, US or European day/month order—applied consistently wherever a date prints.

An optional **logo** sits beside the text so shared group buys or your own stash are instantly recognizable on the shelf. When a logo is present, you can **widen or narrow its column** so the text area compresses or expands to match. When test indicators or COA QR codes are active, the **testing column** adjusts the same way. If both side columns would crowd the text, the app scales them back to keep a readable center. You can remove the logo anytime; the label works fine without branding.

Typography **scales with label height**—taller stock like 40 × 30 mm uses larger type when the content allows, so bigger labels do not look under-filled.

---

### Ready to print

Thermal printers need **sharp black and white**, not subtle grays from a screen capture. Export produces a **monochrome PNG** sized to your selected label dimensions, with physical size metadata embedded for import into apps like Niimbot. The download shows progress, prevents duplicate export attempts, and reports a recoverable failure instead of leaving the interface stuck.

**Print setup** at the top of the sidebar lets you choose the physical **vial capacity**, plus optionally choose a printer model and **label stock**—rounded or rectangular rolls in common sizes—or skip and use the default **40 × 20 mm rounded** stock. Vial capacity is shared with Calculator mode and persists across visits. The live preview is **what you print**: same padding, corner shape, and dimensions as the downloaded PNG.

When you **select a printer**, export resolution matches that device’s native DPI (for example **203 DPI** on Niimbot B21, **300 DPI** on M2, B21 Pro, and B1 Pro). With no printer selected, export stays at **300 DPI** so high-resolution printers and import apps get a sharp file. Label **stock** (not the printer alone) drives corner shape and padding.

The print catalog includes **Niimbot B1 Pro** and **40 × 30 mm** stock (rounded and rectangular), alongside existing B21 / M2 / B21 Pro options and 40 × 20 mm and 50 × 30 mm rolls.

The preview banner shows your active label size and corner shape at a glance; selecting it opens **Print setup** even after that section has been collapsed. Padding is tighter on **rounded** stock because Niimbot already insets rounded templates.

The download name reflects your compound when you have named one, so saved files are easy to find later.

---

## Planned

Items below are ordered **easiest to hardest** to implement. Where one feature depends on another, the prerequisite comes first.

---

### Support the project

The landing page will include an optional way to **contribute** if the app has been useful—no paywall, no required amount. Copy along the lines of *if you got value from the app, consider a $5 contribution* sets a gentle suggestion without prescribing what support should look like; you choose what feels fair.

**Credit card** checkout lowers friction for most people. **Cryptocurrency** will be offered as well for contributors who prefer more **privacy** when supporting community tools. Contributing stays entirely optional and separate from using the calculator or label designer.

---

### User-selected label size

Today you can pick from catalog **label stock** (rounded or rectangular rolls in common sizes) or enter custom width and height. Custom mode stays open while you edit and requires positive values before applying the dimensions.

In practice, **thermal printers and adhesive stock still vary** beyond what the catalog lists today. The product will expand stock profiles and make dimension choice clearer as more rolls are validated on real hardware.

---

### Printer-guided label selection

Manual dimensions help power users; most people just want **“it works on my printer.”** The product will maintain a **curated list of common thermal label printers**. You pick your printer and **vial capacity**; the app suggests the **label size** that typically fits that combination.

When a printer supports **more than one plausible stock size** for the same vial, you choose which roll you use—no guesswork, but no false certainty either. This sits alongside free-form dimensions: guided setup when you want it, full control when you need it.

*Requires: user-selected label size.*

---

### Section styling options

The current layout prioritizes readability on the smallest labels with a consistent type treatment. Planned styling controls will let you tune **how each section looks on the label**—starting with **font choices per section** (compound, reconstitution, protocol, sourcing, and so on) so a minimal label can stay minimal and a branded group-buy label can feel distinct, within what still fits on small stock.

*Benefits from flexible label sizes so typography choices remain legible across dimensions.*

---

### Additional label templates

Beyond the single layout in **Today**, the product will offer **additional templates**—alternative arrangements of the same information (hierarchy, spacing, which blocks dominate visually) that you pick before or while designing. New templates will respect the same calculator, compliance, and print-target rules; they change **presentation**, not the underlying math or data model.

*Benefits from flexible label sizes and a stable layout engine; more work per template than section styling alone.*

---

### Compound name as the primary read

On labels with reconstitution, protocol, and source filled in, the **compound name can disappear into the same visual weight as the section blocks**—readable, but not clearly the first thing you see on the vial. That undermines the main job of the sticker: **instant identity** at a glance.

**Today** addresses this with a two-line title (name, then amount), a larger title budget than the body, and an **identity header** band above the three-column row. Further **label templates** may offer other hierarchy treatments.

Any approach must still fit **40 × 20 mm** stock with logo and QR when those are on, and stay aligned with preview = export.

*Partially addressed in **Today** (identity header, two-line title, larger title budget). Related: section styling options, additional label templates; compound name casing tracked separately in [TECH-DEBT.md](./TECH-DEBT.md).*

---

### Color label export

Most of **Today** is built around **monochrome thermal** output—sharp black on white for 203 DPI class devices. Some label printers support **color stock or color printing**, which may change preview, export format, and how emphasis (for example untested warnings) appears on the physical sticker.

Color support is planned as a **print-target option** once requirements are clearer: what file types and color spaces those printers expect, whether the live preview should mirror color, and which design elements benefit from color versus staying high-contrast for legibility. Until then, export remains monochrome-first.

*Benefits from a settled print-target model (dimensions, DPI, and optional templates/styling).*

---

### Saved test results library

Today you set pass, fail, or not-run **per label** in the Testing section. The product will add a **library of saved test results**—batch or lot keyed records you can reuse when designing labels, so you are not re-entering the same Mass, Purity, and LC/MS outcomes for every vial from the same run. Full COA documents stay wherever you already store them; the library is for the summary you want on the sticker.

*Requires: accounts and saved data (or a lighter local-only store first).*

---

### Accounts and saved data

In a later phase, **account creation** will let you sign in and keep a small set of **personal defaults** across sessions: a **logo** ready for labels, **saved protocols**, and other repeat entries you should not have to retype for every vial.

That layer builds on the landing page and calculator/designer split—research-use acknowledgment and lightweight calculator access stay available without an account; saved data is for people who print often and want their bench setup to follow them.

*Requires: largest scope—identity, storage, and persistence. Builds on shipping landing + calculator/designer split.*

---

### Freemium membership

The product will move to a **freemium model**: core value stays available without paying, while a **membership** unlocks additional capability for people who use the app heavily or want the fuller toolkit.

One guiding principle is already clear: features that carry **ongoing operational cost**—for example **persistence** (cloud-saved data) or possible **AI-assisted** tools—belong behind membership. The rest of the free-versus-paid split, and how people pay, will be decided when this ships. Optional one-off **Support the project** contributions remain a separate path from membership; membership is for ongoing access to paid capability, not a tip jar.

*Requires: accounts and saved data (membership needs a signed-in identity); builds on landing page and entry paths.*
