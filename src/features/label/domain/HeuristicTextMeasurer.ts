import type { TextMeasurer } from './ports'

/**
 * Deterministic, browser-free text width estimate for unit tests and as the
 * LabelLayoutEngine / LabelComposer constructor default. Not pixel-accurate —
 * production uses CanvasTextMeasurer. Relative widths are rough groupings for
 * a bold sans (narrow / medium / wide); unknown characters use the medium width.
 */
const NARROW_EM = 0.35
const MEDIUM_EM = 0.62
const WIDE_EM = 0.9

const NARROW = new Set("iljftI.,' ".split(''))
const WIDE = new Set('mwMW'.split(''))

function charWidthEm(ch: string): number {
  if (NARROW.has(ch)) return NARROW_EM
  if (WIDE.has(ch)) return WIDE_EM
  return MEDIUM_EM
}

/** Slight stretch for heavier weights so title (900) measures wider than body (600). */
function weightScale(fontWeight: number): number {
  if (fontWeight >= 900) return 1.12
  if (fontWeight >= 800) return 1.05
  return 1
}

export class HeuristicTextMeasurer implements TextMeasurer {
  measureWidthPx(text: string, fontPx: number, fontWeight: number): number {
    if (!text || fontPx <= 0) return 0
    let em = 0
    for (const ch of text) em += charWidthEm(ch)
    return em * fontPx * weightScale(fontWeight)
  }
}
