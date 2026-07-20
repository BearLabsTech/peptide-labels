import type { CuratedDesignFontId } from './designDocument'
import { CURATED_DESIGN_FONT_IDS } from './designDocument'

/** CSS font-family stacks for curated design font ids (thermal-friendly). */
const FONT_STACKS: Record<CuratedDesignFontId, string> = {
  sans: 'Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'Consolas, "Courier New", monospace',
  display: 'Arial Black, Arial, Helvetica, sans-serif',
}

export function resolveDesignFontFamily(fontId: string): string {
  if ((CURATED_DESIGN_FONT_IDS as readonly string[]).includes(fontId)) {
    return FONT_STACKS[fontId as CuratedDesignFontId]
  }
  return FONT_STACKS.sans
}

/** Convert print points to container-query width units on the label. */
export function fontSizePtToCqw(fontSizePt: number, labelWidthMm: number): string {
  const fontSizeMm = fontSizePt * (25.4 / 72)
  return `${(fontSizeMm / labelWidthMm) * 100}cqw`
}
