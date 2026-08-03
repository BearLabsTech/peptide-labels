import { CUSTOM_STOCK_PADDING_MM, DEFAULT_DPI, SKIP_DEFAULT_TARGET } from './defaults'
import { getPrinterById, getStockById } from './printCatalog'
import { normalizePrintSetup } from './printStorage'
import type { LabelShape, PrintSetupSelection, PrintTarget } from './types'
import { normalizeVialCapacityMl } from './vialCapacity'

/** Skip/default uses 300 DPI; a selected printer uses its native DPI. */
export function resolveEffectiveDpi(selection: Partial<PrintSetupSelection>): number {
  if (selection.printerId) {
    const printer = getPrinterById(selection.printerId)
    if (printer) return printer.dpi
  }
  return DEFAULT_DPI
}

/**
 * `normalizePrintSetup` (in `printStorage.ts`) is the one place the legacy
 * `labelId`/`vialMl` fields are migrated to `stockId`/`vialCapacityMl`. This
 * resolver normalizes first rather than keeping a second migration table, so
 * a legacy selection cannot resolve to a different label than persistence
 * would have produced for the same input.
 */
export function resolvePrintTarget(selection: Partial<PrintSetupSelection> = {}): PrintTarget {
  const normalized = normalizePrintSetup(selection)
  const effectiveDpi = resolveEffectiveDpi(normalized)
  const stock = normalized.stockId ? getStockById(normalized.stockId) : undefined
  const custom = resolveCustomDimensions(normalized)
  // normalizePrintSetup always sets vialCapacityMl; normalizing again here is a
  // no-op that keeps the return type honest without a non-null assertion.
  const vialCapacityMl = normalizeVialCapacityMl(normalized.vialCapacityMl)

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
      printerId: normalized.printerId,
      vialCapacityMl,
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
      printerId: normalized.printerId,
      vialCapacityMl,
    }
  }

  return {
    ...SKIP_DEFAULT_TARGET,
    effectiveDpi,
    printerId: normalized.printerId,
    vialCapacityMl,
  }
}

function resolveCustomDimensions(selection: Partial<PrintSetupSelection>) {
  if (selection.stockId || selection.labelId) return undefined
  if (selection.widthMm == null || selection.heightMm == null) return undefined
  if (!Number.isFinite(selection.widthMm) || !Number.isFinite(selection.heightMm)) return undefined
  if (selection.widthMm <= 0 || selection.heightMm <= 0) return undefined
  return { widthMm: selection.widthMm, heightMm: selection.heightMm }
}
