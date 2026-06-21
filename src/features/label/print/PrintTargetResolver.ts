import { DEFAULT_DPI, LABEL_PADDING_MM, SKIP_DEFAULT_TARGET } from './defaults'
import { getLabelById, getPrinterById } from './printCatalog'
import type { PrintSetupSelection, PrintTarget } from './types'

export function resolveEffectiveDpi(selection: PrintSetupSelection): number {
  if (selection.printerId) {
    const printer = getPrinterById(selection.printerId)
    if (printer) return printer.dpi
  }
  return DEFAULT_DPI
}

export function resolvePrintTarget(selection: Partial<PrintSetupSelection> = {}): PrintTarget {
  const effectiveDpi = resolveEffectiveDpi(selection)
  const dimensions = resolveLabelDimensions(selection)

  return {
    labelWidthMm: dimensions.widthMm,
    labelHeightMm: dimensions.heightMm,
    effectiveDpi,
    paddingMm: LABEL_PADDING_MM,
    printerId: selection.printerId,
    labelId: selection.labelId ?? dimensions.labelId,
    vialMl: selection.vialMl ?? SKIP_DEFAULT_TARGET.vialMl,
  }
}

function resolveLabelDimensions(selection: Partial<PrintSetupSelection>): {
  widthMm: number
  heightMm: number
  labelId?: string
} {
  if (selection.widthMm != null && selection.heightMm != null) {
    return {
      widthMm: selection.widthMm,
      heightMm: selection.heightMm,
      labelId: selection.labelId,
    }
  }

  if (selection.labelId) {
    const label = getLabelById(selection.labelId)
    if (label) {
      return { widthMm: label.widthMm, heightMm: label.heightMm, labelId: label.id }
    }
  }

  return {
    widthMm: SKIP_DEFAULT_TARGET.labelWidthMm,
    heightMm: SKIP_DEFAULT_TARGET.labelHeightMm,
    labelId: SKIP_DEFAULT_TARGET.labelId,
  }
}
