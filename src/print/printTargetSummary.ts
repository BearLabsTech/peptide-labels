import type { LabelShape, PrintTarget } from './types'

export function formatLabelSizeMm(widthMm: number, heightMm: number): string {
  return `${widthMm} × ${heightMm} mm`
}

function formatShapeLabel(shape: LabelShape): string {
  return shape === 'rounded' ? 'rounded corners' : 'rectangular'
}

export function formatPrintTargetSummary(
  target: PrintTarget,
  printerName?: string,
): { primary: string; secondary?: string } {
  const primary = `${formatLabelSizeMm(target.labelWidthMm, target.labelHeightMm)} · ${formatShapeLabel(target.shape)}`
  const parts: string[] = []
  if (printerName) parts.push(printerName)
  parts.push(`${target.vialCapacityMl} ml vial capacity`)
  return {
    primary,
    secondary: parts.length > 0 ? parts.join(' · ') : 'Default print setup',
  }
}
