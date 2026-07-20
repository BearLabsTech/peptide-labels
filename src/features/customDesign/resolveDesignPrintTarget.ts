import { DEFAULT_DPI } from '../label/print/defaults'
import { getPrinterById, getStockById } from '../label/print/printCatalog'
import type { PrintTarget } from '../label/print/types'
import { DEFAULT_VIAL_CAPACITY_ML, normalizeVialCapacityMl } from '../label/vialCapacity'
import type { DesignDocument, DesignStock } from './designDocument'

export type ResolveDesignPrintTargetOptions = {
  printerId?: string
  vialCapacityMl?: number
}

function resolveEffectiveDpi(printerId?: string): number {
  if (!printerId) return DEFAULT_DPI
  return getPrinterById(printerId)?.dpi ?? DEFAULT_DPI
}

function stockToPrintTarget(
  stock: DesignStock,
  effectiveDpi: number,
  vialCapacityMl: number,
  printerId?: string,
): PrintTarget {
  if (stock.kind === 'catalog') {
    const catalog = getStockById(stock.stockId)
    if (!catalog) {
      throw new Error(`Unknown catalog stock id "${stock.stockId}"`)
    }
    return {
      labelWidthMm: catalog.widthMm,
      labelHeightMm: catalog.heightMm,
      effectiveDpi,
      paddingMm: catalog.paddingMm,
      shape: catalog.shape,
      cornerRadiusMm: catalog.cornerRadiusMm,
      stockId: catalog.id,
      dimensionId: catalog.dimensionId,
      printerId,
      vialCapacityMl,
    }
  }

  return {
    labelWidthMm: stock.widthMm,
    labelHeightMm: stock.heightMm,
    effectiveDpi,
    paddingMm: stock.paddingMm,
    shape: stock.shape,
    cornerRadiusMm: stock.cornerRadiusMm,
    printerId,
    vialCapacityMl,
  }
}

/** Map a design’s locked stock to a PrintTarget for preview/export. */
export function resolveDesignPrintTarget(
  design: DesignDocument,
  options: ResolveDesignPrintTargetOptions = {},
): PrintTarget {
  const effectiveDpi = resolveEffectiveDpi(options.printerId)
  const vialCapacityMl = normalizeVialCapacityMl(
    options.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML,
  )
  return stockToPrintTarget(design.stock, effectiveDpi, vialCapacityMl, options.printerId)
}
