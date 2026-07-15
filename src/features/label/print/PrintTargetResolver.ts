import { CUSTOM_STOCK_PADDING_MM, DEFAULT_DPI, SKIP_DEFAULT_TARGET } from './defaults'
import { DEFAULT_STOCK_ID, getPrinterById, getStockById } from './printCatalog'
import type { LabelShape, PrintSetupSelection, PrintTarget } from './types'
import { normalizeVialCapacityMl } from '../vialCapacity'

/** Skip/default uses 300 DPI; a selected printer uses its native DPI. */
export function resolveEffectiveDpi(selection: Partial<PrintSetupSelection>): number {
  if (selection.printerId) {
    const printer = getPrinterById(selection.printerId)
    if (printer) return printer.dpi
  }
  return DEFAULT_DPI
}

export function resolvePrintTarget(selection: Partial<PrintSetupSelection> = {}): PrintTarget {
  const effectiveDpi = resolveEffectiveDpi(selection)
  const stock = resolveStock(selection)
  const custom = resolveCustomDimensions(selection)

  if (stock) {
    return {
      labelWidthMm: stock.widthMm,
      labelHeightMm: stock.heightMm,
      effectiveDpi,
      paddingMm: stock.paddingMm,
      shape: stock.shape,
      cornerRadiusMm: stock.cornerRadiusMm,
      stockId: stock.id,
      dimensionId: stock.dimensionId,
      printerId: selection.printerId,
      vialCapacityMl: normalizeVialCapacityMl(selection.vialCapacityMl ?? selection.vialMl),
    }
  }

  if (custom) {
    return {
      labelWidthMm: custom.widthMm,
      labelHeightMm: custom.heightMm,
      effectiveDpi,
      paddingMm: CUSTOM_STOCK_PADDING_MM,
      shape: 'rectangular' satisfies LabelShape,
      cornerRadiusMm: 0,
      printerId: selection.printerId,
      vialCapacityMl: normalizeVialCapacityMl(selection.vialCapacityMl ?? selection.vialMl),
    }
  }

  return {
    ...SKIP_DEFAULT_TARGET,
    effectiveDpi,
    printerId: selection.printerId,
    vialCapacityMl: normalizeVialCapacityMl(selection.vialCapacityMl ?? selection.vialMl),
  }
}

function resolveStock(selection: Partial<PrintSetupSelection>) {
  const stockId = selection.stockId ?? legacyLabelIdToStockId(selection.labelId)
  if (!stockId) return undefined
  return getStockById(stockId)
}

function resolveCustomDimensions(selection: Partial<PrintSetupSelection>) {
  if (selection.stockId || selection.labelId) return undefined
  if (selection.widthMm == null || selection.heightMm == null) return undefined
  if (!Number.isFinite(selection.widthMm) || !Number.isFinite(selection.heightMm)) return undefined
  if (selection.widthMm <= 0 || selection.heightMm <= 0) return undefined
  return { widthMm: selection.widthMm, heightMm: selection.heightMm }
}

function legacyLabelIdToStockId(labelId?: string): string | undefined {
  if (labelId === '40x20') return DEFAULT_STOCK_ID
  if (labelId === '50x30') return '50x30-rounded'
  return undefined
}
