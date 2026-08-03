/**
 * Single-sourced user-facing UI strings shared across calculator, label designer,
 * landing, and workspace chrome. Keep wording aligned with docs/COPY-GUIDELINES.md.
 */

export const WORKSPACE_MODE_LABELS = {
  calculator: 'Calculator',
  designer: 'Label designer',
  customDesign: 'Custom design (feature in progress)',
} as const

export const HANDOFF_PROMPT = 'Turn this into a label?'

/** Canonical form / result labels for quantities that appear in both calculator and designer. */
export const FIELD_LABELS = {
  compoundAmount: 'Compound amount',
  drawVolume: 'Draw volume',
  waterVolume: 'Water volume',
  /** Compact calculator chip when space is tight — same quantity as {@link FIELD_LABELS.drawVolume}. */
  drawVolumeShort: 'Draw volume',
  /** Compact calculator chip — same quantity as {@link FIELD_LABELS.waterVolume}. */
  waterVolumeShort: 'Water volume',
} as const

/**
 * COA captions on the printed label use short acronyms (GB / TG) for thermal width.
 * Sidebar fields use the expanded names so the control is self-explanatory.
 */
export const COA_QR_CAPTIONS = {
  vendor: 'Vendor COA',
  groupBuy: 'GB COA',
  testGroup: 'TG COA',
  my: 'My COA',
} as const

export const COA_FIELD_LABELS = {
  vendor: 'Vendor COA Link',
  groupBuy: 'Group Buy COA Link',
  testGroup: 'Test Group COA Link',
  my: 'My COA Link',
} as const
