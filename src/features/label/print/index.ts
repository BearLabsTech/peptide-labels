export * from './types'
export * from './defaults'
export * from './dimensions'
export * from './printCatalog'
export * from './PrintTargetResolver'
export * from './PrintCatalogFilter'
export * from './exportSpec'
export * from './monochrome'
export * from './pngPhys'
export * from './printStorage'

export function formatLabelSizeMm(widthMm: number, heightMm: number): string {
  return `${widthMm} × ${heightMm} mm`
}

export function formatPrintTargetSummary(
  target: import('./types').PrintTarget,
  printerName?: string,
): { primary: string; secondary?: string } {
  const primary = formatLabelSizeMm(target.labelWidthMm, target.labelHeightMm)
  const parts: string[] = []
  if (printerName) parts.push(printerName)
  if (target.vialMl != null) parts.push(`${target.vialMl} ml vial`)
  return {
    primary,
    secondary: parts.length > 0 ? parts.join(' · ') : 'Default print setup',
  }
}
